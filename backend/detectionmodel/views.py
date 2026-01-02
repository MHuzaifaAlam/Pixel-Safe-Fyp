import os
import torch
from PIL import Image as PILImage
from torchvision import transforms
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Import your models
from imageapp.models import Image as UserImage
from .models import ScanReport
# Ensure your logic file is named forensic.py or update the import below
from .forensic import get_model, LOTABitPlaneExtractor, device
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_scan_report(request):
    image_id = request.data.get('image_id')
    uploaded_file = request.FILES.get('image') # ✅ Capture the raw file from FormData

    try:
        # --- STEP 1: LOAD IMAGE ---
        if uploaded_file:
            # Dual-layer path: Processing the file directly
            pil_img = PILImage.open(uploaded_file).convert('RGB')
            file_name = uploaded_file.name
            image_obj = None # No DB link yet
        elif image_id:
            # Standard path: Fetching from DB
            image_obj = UserImage.objects.get(ImageID=image_id)
            if not os.path.exists(image_obj.image.path):
                return Response({"error": "Physical image file missing"}, status=400)
            pil_img = PILImage.open(image_obj.image.path).convert('RGB')
            file_name = image_obj.fileName
        else:
            return Response({"error": "No image or image_id provided"}, status=400)

        # --- STEP 2: PRE-PROCESSING ---
        extractor = LOTABitPlaneExtractor()
        rgb_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        bp_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor()
        ])

        bp_img = extractor(pil_img)
        rgb_tensor = rgb_transform(pil_img).unsqueeze(0).to(device)
        bp_tensor = bp_transform(bp_img).unsqueeze(0).to(device)

        # --- STEP 3: INFERENCE ---
        model = get_model()
        with torch.no_grad():
            output = model(rgb_tensor, bp_tensor)
            prob = output.cpu().item()

        # --- STEP 4: VERDICT LOGIC ---
        ai_percent = round(prob * 100, 2)
        if prob >= 0.90:
            level, note = "HIGH INTENSITY AI", "Widespread chaotic patterns detected."
        elif 0.70 <= prob < 0.90:
            level, note = "MODERATE INTENSITY AI", "Significant synthetic artifacts present."
        elif 0.50 <= prob < 0.70:
            level, note = "LOW INTENSITY AI", "Possible generative origin detected or edited."
        else:
            level, note = "AUTHENTIC / REAL", "Natural noise distribution detected."

        # --- STEP 5: SAVE REPORT ---
        # We only save if there is an image_obj in DB; otherwise, it's just a live check
        if image_obj:
            ScanReport.objects.create(
                user=request.user,
                image=image_obj,
                ai_score=ai_percent,
                verdict=level,
                note=note
            )

        return Response({
            "status": "Analysis Complete",
            "score": ai_percent,
            "verdict": level,
            "note": note,
            "file_name": file_name
        }, status=200)

    except UserImage.DoesNotExist:
        return Response({"error": "Image ID not found"}, status=404)
    except Exception as e:
        print(f"--- FORENSIC ERROR: {str(e)} ---")
        return Response({"error": "Internal Model Error"}, status=500)
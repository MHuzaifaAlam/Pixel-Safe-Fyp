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
    """
    Main forensic analysis endpoint. 
    Processes RGB and Bit-Plane paths through the PixelSafeDualModel.
    """
    image_id = request.data.get('image_id')
    scan_mode = request.data.get('scan_mode', 'gan') # default to gan if missing

    try:
        # 1. Fetch Image from database
        image_obj = UserImage.objects.get(ImageID=image_id)
        img_path = image_obj.image.path
        
        # 2. Safety Check: Verify physical file exists
        if not os.path.exists(img_path):
            return Response({"error": f"Physical image file not found at {img_path}"}, status=400)

        # 3. Pre-processing
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

        # Open and process image
        pil_img = PILImage.open(img_path).convert('RGB')
        bp_img = extractor(pil_img)
        
        # Prepare Tensors for model
        rgb_tensor = rgb_transform(pil_img).unsqueeze(0).to(device)
        bp_tensor = bp_transform(bp_img).unsqueeze(0).to(device)

        # 4. Inference
        model = get_model() # Loads weights onto correct device (CPU/GPU)
        with torch.no_grad():
            output = model(rgb_tensor, bp_tensor)
            # Ensure we extract a single float value
            prob = output.cpu().item()

        # 5. Logic for Verdict (Aligned with PixelSafe Script)
        ai_percent = round(prob * 100, 2)
        
        if prob >= 0.90:
            level, note = "HIGH INTENSITY AI", "Widespread chaotic patterns detected."
        elif 0.70 <= prob < 0.90:
            level, note = "MODERATE INTENSITY AI", "Significant synthetic artifacts present."
        elif 0.50 <= prob < 0.70:
            level, note = "LOW INTENSITY AI", "Possible generative origin detected or edited."
        else:
            level, note = "AUTHENTIC / REAL", "Natural noise distribution detected."

        # 6. Save Report to Database
        report = ScanReport.objects.create(
            user=request.user,
            image=image_obj,
            ai_score=ai_percent,
            verdict=level,
            note=note
        )

        # 7. Final Response for Frontend Popup
        return Response({
            "status": "Analysis Complete",
            "image_id": str(image_obj.ImageID),
            "file_name": image_obj.fileName,
            "score": ai_percent,
            "verdict": level,
            "note": note
        }, status=200)

    except UserImage.DoesNotExist:
        return Response({"error": "Image not found in database"}, status=404)
    except Exception as e:
        # This will show the exact error (like FileNotFoundError or CUDA error) in your terminal
        print(f"--- DATABASE/ML ERROR: {str(e)} ---")
        return Response({"error": str(e)}, status=400)
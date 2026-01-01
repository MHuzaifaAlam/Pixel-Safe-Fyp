import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
import os

# --- Model Architecture ---
class PixelSafeDualModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.rgb_backbone = models.resnet18()
        self.rgb_features = nn.Sequential(*list(self.rgb_backbone.children())[:-1])
        self.bp_path = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128), nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.fusion = nn.Sequential(
            nn.Linear(512 + 128, 256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 64), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(64, 1)
        )

    def forward(self, rgb_img, bp_img):
        rgb_feat = torch.flatten(self.rgb_features(rgb_img), 1)
        if bp_img.dim() == 3: bp_img = bp_img.unsqueeze(1)
        bp_feat = torch.flatten(self.bp_path(bp_img), 1)
        combined = torch.cat([rgb_feat, bp_feat], dim=1)
        return torch.sigmoid(self.fusion(combined))

class LOTABitPlaneExtractor:
    def __call__(self, img):
        img_array = np.array(img, dtype=np.uint8)
        if len(img_array.shape) == 2:
            img_array = np.stack([img_array]*3, axis=-1)
        height, width, channels = img_array.shape
        bit_plane_img = np.zeros((height, width), dtype=np.uint8)
        for c in range(channels):
            for bit_pos in range(3):
                bit_plane = ((img_array[:, :, c] >> bit_pos) & 1) * (2 ** bit_pos)
                bit_plane_img = np.maximum(bit_plane_img, bit_plane)
        return Image.fromarray((bit_plane_img > 0).astype(np.uint8) * 255)

# --- Global Model Loader ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml_model', 'pixel_safe_model.pth')
_model_instance = None

# detectionmodel/ml_logic.py

def get_model():
    global _model_instance
    if _model_instance is None:
        # Determine device automatically
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        _model_instance = PixelSafeDualModel().to(device)
        
        # Load weights and force them to the correct device
        checkpoint = torch.load(MODEL_PATH, map_location=device) 
        
        state_dict = checkpoint['model_state_dict'] if 'model_state_dict' in checkpoint else checkpoint
        _model_instance.load_state_dict(state_dict)
        _model_instance.eval()
    return _model_instance
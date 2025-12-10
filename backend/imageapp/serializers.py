# serializers.py
from rest_framework import serializers
from .models import Image

class ImageSerializer(serializers.ModelSerializer):
    batch_group = serializers.CharField(read_only=True)  # Show as string
    is_batch_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Image
        fields = [
            'ImageID', 
            'fileName', 
            'format', 
            'ImageSize', 
            'uploaded_at', 
            'Status',
            'image',  # URL to original
            'batch_group',  # New field
            'batch_position',  # New field
            'is_batch_image'  # Helper field
        ]
        read_only_fields = [
            'ImageID', 'uploaded_at', 'Status',
            'fileName', 'format', 'ImageSize',
            'batch_group', 'batch_position'
        ]
    
    def get_is_batch_image(self, obj):
        """Check if image is part of a batch"""
        return obj.batch_group is not None
from rest_framework import serializers
from .models import ScanReport
from imageapp.models import Image  # Importing to access fields if needed

class ScanReportSerializer(serializers.ModelSerializer):
    # Pulling extra information from the linked Image model in imageapp
    file_name = serializers.ReadOnlyField(source='image.fileName')
    image_url = serializers.SerializerMethodField()
    batch_id = serializers.ReadOnlyField(source='image.batch.BatchID')
    original_format = serializers.ReadOnlyField(source='image.format')
    
    class Meta:
        model = ScanReport
        fields = [
            'id', 
            'image',          # This is the Image UUID
            'file_name', 
            'image_url', 
            'batch_id',
            'original_format',
            'ai_score', 
            'verdict', 
            'note', 
            'timestamp'
        ]

    def get_image_url(self, obj):
        # Safely return the full URL of the image for the React frontend
        if obj.image and obj.image.image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.image.image.url)
            return obj.image.image.url
        return None
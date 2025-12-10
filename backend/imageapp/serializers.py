# # serializers.py
# from rest_framework import serializers
# from .models import Image

# class ImageSerializer(serializers.ModelSerializer):
#     batch_group = serializers.CharField(read_only=True)  # Show as string
#     is_batch_image = serializers.SerializerMethodField()
    
#     class Meta:
#         model = Image
#         fields = [
#             'ImageID', 
#             'fileName', 
#             'format', 
#             'ImageSize', 
#             'uploaded_at', 
#             'Status',
#             'image',  # URL to original
#             'batch_group',  # New field
#             'batch_position',  # New field
#             'is_batch_image'  # Helper field
#         ]
#         read_only_fields = [
#             'ImageID', 'uploaded_at', 'Status',
#             'fileName', 'format', 'ImageSize',
#             'batch_group', 'batch_position'
#         ]
    
#     def get_is_batch_image(self, obj):
#         """Check if image is part of a batch"""
#         return obj.batch_group is not None


from rest_framework import serializers
from .models import Image, Batch

class ImageSerializer(serializers.ModelSerializer):
    batch_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Image
        fields = [
            'ImageID', 
            'fileName', 
            'format', 
            'ImageSize', 
            'uploaded_at', 
            'Status',
            'image',
            'batch',
            'batch_position',
            'batch_name'
        ]
        read_only_fields = [
            'ImageID', 'uploaded_at', 'Status',
            'fileName', 'format', 'ImageSize',
            'batch', 'batch_position'
        ]
    
    def get_batch_name(self, obj):
        return obj.batch.name if obj.batch else None

class BatchSerializer(serializers.ModelSerializer):
    image_count = serializers.SerializerMethodField()
    first_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Batch
        fields = [
            'BatchID',
            'name',
            'created_at',
            'status',
            'image_count',
            'first_image'
        ]
        read_only_fields = ['BatchID', 'created_at']
    
    def get_image_count(self, obj):
        return obj.images.count()
    
    def get_first_image(self, obj):
        first_image = obj.images.order_by('batch_position').first()
        if first_image:
            return {
                'ImageID': str(first_image.ImageID),
                'fileName': first_image.fileName,
                'image_url': first_image.image.url if first_image.image else None
            }
        return None
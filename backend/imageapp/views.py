# # views.py
# from rest_framework import viewsets, permissions, status
# from rest_framework.response import Response
# from rest_framework.decorators import action
# from .models import Image
# from .serializers import ImageSerializer
# import uuid
# import time

# class UserImageView(viewsets.ModelViewSet):
#     serializer_class = ImageSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         # Return only images uploaded by the logged-in user
#         return Image.objects.filter(user=self.request.user)

#     def create(self, request, *args, **kwargs):
#         # Handle multiple image uploads
#         files = request.FILES.getlist('images')  # 'images' is the form-data key
#         images = []
        
#         if not files:
#             return Response(
#                 {'error': 'No images provided'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         # ✅ NEW: Determine if this is a batch
#         is_batch = len(files) > 1
#         batch_id = None
        
#         if is_batch:
#             # Generate ONE batch ID for all images in this batch
#             batch_id = uuid.uuid4()
        
#         # Create each image
#         for i, file in enumerate(files):
#             # Create image with batch info
#             image = Image.objects.create(
#                 user=request.user,
#                 image=file,
#                 fileName=file.name,
#                 format=file.name.split('.')[-1].lower() if '.' in file.name else '',
#                 ImageSize=file.size,
                
#                 # ✅ NEW: Add batch tracking
#                 batch_group=batch_id if is_batch else None,
#                 batch_position=i if is_batch else None,
                
#                 Status='uploaded'
#             )
#             images.append(image)
            
#             # Start processing (simulate)
#             self.process_image_async(image)
        
#         # Prepare response
#         serializer = ImageSerializer(images, many=True)
        
#         response_data = {
#             'count': len(images),
#             'images': serializer.data,
#         }
        
#         if is_batch:
#             response_data['batch_id'] = str(batch_id)
#             response_data['is_batch'] = True
#             response_data['message'] = f'Batch of {len(images)} images uploaded'
#         else:
#             response_data['is_batch'] = False
#             response_data['message'] = 'Single image uploaded successfully'
        
#         return Response(response_data, status=status.HTTP_201_CREATED)
    
#     def process_image_async(self, image):
#         """
#         Simple processing simulation
#         """
#         try:
#             # Update status to processing
#             image.Status = 'processing'
#             image.save()
            
#             # Simulate processing time (2 seconds)
#             time.sleep(2)
            
#             # Mark as completed
#             image.Status = 'completed'
#             image.save()
            
#         except Exception as e:
#             image.Status = 'failed'
#             image.save()
    
#     # ✅ NEW: Get batches endpoint
#     @action(detail=False, methods=['get'])
#     def batches(self, request):
#         """
#         Get all batches for the current user
#         """
#         # Get all images that belong to batches
#         batch_images = Image.objects.filter(
#             user=request.user,
#             batch_group__isnull=False
#         ).order_by('batch_group', 'batch_position')
        
#         # Group by batch_group
#         batches_dict = {}
#         for image in batch_images:
#             batch_id = str(image.batch_group)
#             if batch_id not in batches_dict:
#                 batches_dict[batch_id] = {
#                     'batch_id': batch_id,
#                     'created_at': image.uploaded_at,
#                     'images': [],
#                     'total_images': 0,
#                     'status_summary': {}
#                 }
            
#             batches_dict[batch_id]['images'].append({
#                 'ImageID': str(image.ImageID),
#                 'fileName': image.fileName,
#                 'Status': image.Status,
#                 'batch_position': image.batch_position
#             })
#             batches_dict[batch_id]['total_images'] += 1
        
#         # Convert to list
#         batches_list = list(batches_dict.values())
        
#         return Response({
#             'batches': batches_list,
#             'total_batches': len(batches_list)
#         })
    
#     # ✅ NEW: Get images by batch ID
#     @action(detail=False, methods=['get'])
#     def batch(self, request):
#         """
#         Get images for a specific batch
#         """
#         batch_id = request.query_params.get('batch_id')
#         if not batch_id:
#             return Response(
#                 {'error': 'batch_id parameter is required'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         try:
#             # Convert string to UUID
#             batch_uuid = uuid.UUID(batch_id)
#         except ValueError:
#             return Response(
#                 {'error': 'Invalid batch_id format'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         images = Image.objects.filter(
#             user=request.user,
#             batch_group=batch_uuid
#         ).order_by('batch_position')
        
#         serializer = self.get_serializer(images, many=True)
        
#         return Response({
#             'batch_id': batch_id,
#             'total_images': images.count(),
#             'images': serializer.data
#         })


from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Image, Batch
from .serializers import ImageSerializer, BatchSerializer
import time
from django.utils import timezone

# ============ IMAGE VIEWSET ============
class UserImageView(viewsets.ModelViewSet):
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Image.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        files = request.FILES.getlist('images')
        batch_name = request.data.get('batch_name', '').strip()
        
        if not files:
            return Response(
                {'error': 'No images provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        images_created = []
        batch = None
        is_batch = len(files) > 1
        
        # Create Batch if multiple files
        if is_batch:
            # Auto-generate batch name if not provided
            if not batch_name:
                batch_name = f"Batch {timezone.now().strftime('%b %d, %I:%M %p')}"
            
            batch = Batch.objects.create(
                user=request.user,
                name=batch_name
            )
        
        # Create each image
        for i, file in enumerate(files):
            image = Image.objects.create(
                user=request.user,
                image=file,
                fileName=file.name,
                format=file.name.split('.')[-1].lower() if '.' in file.name else '',
                ImageSize=file.size,
                batch=batch if is_batch else None,
                batch_position=i if is_batch else None,
                Status='uploaded'
            )
            images_created.append(image)
            
            # Process image
            self.process_image_async(image)
        
        # Update batch status
        if batch:
            batch.status = 'completed'
            batch.save()
        
        # Prepare response
        serializer = ImageSerializer(images_created, many=True)
        
        response_data = {
            'count': len(images_created),
            'images': serializer.data,
        }
        
        if is_batch:
            response_data.update({
                'is_batch': True,
                'batch': {
                    'id': str(batch.BatchID),
                    'name': batch.name,
                    'created_at': batch.created_at,
                    'image_count': len(images_created)
                },
                'message': f'Batch "{batch.name}" created with {len(files)} images'
            })
        else:
            response_data.update({
                'is_batch': False,
                'message': 'Single image uploaded successfully'
            })
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def process_image_async(self, image):
        try:
            image.Status = 'processing'
            image.save()
            time.sleep(2)
            image.Status = 'completed'
            image.save()
        except Exception as e:
            image.Status = 'failed'
            image.save()

# ============ BATCH VIEWSET ============
class BatchViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Batch.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def images(self, request, pk=None):
        batch = self.get_object()
        images = batch.images.all().order_by('batch_position')
        
        serializer = ImageSerializer(images, many=True)
        
        return Response({
            'batch_id': str(batch.BatchID),
            'batch_name': batch.name,
            'created_at': batch.created_at,
            'total_images': images.count(),
            'images': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        search_term = request.query_params.get('name', '').strip()
        
        if not search_term:
            return Response(
                {'error': 'Please provide a search term'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        batches = Batch.objects.filter(
            user=request.user,
            name__icontains=search_term
        )
        
        serializer = self.get_serializer(batches, many=True)
        
        return Response({
            'search_term': search_term,
            'count': batches.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        batches = self.get_queryset()
        
        batch_images = Image.objects.filter(
            user=request.user,
            batch__isnull=False
        )
        
        largest_batch = 0
        if batches.exists():
            largest_batch = batches.annotate(
                image_count=Count('images')
            ).order_by('-image_count').first().image_count
        
        return Response({
            'total_batches': batches.count(),
            'total_batch_images': batch_images.count(),
            'largest_batch': largest_batch,
            'recent_batches': BatchSerializer(
                batches.order_by('-created_at')[:5], 
                many=True
            ).data
        })
    
    @action(detail=True, methods=['patch'])
    def rename(self, request, pk=None):
        batch = self.get_object()
        new_name = request.data.get('new_name', '').strip()
        
        if not new_name:
            return Response(
                {'error': 'new_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        batch.name = new_name
        batch.save()
        
        return Response({
            'success': True,
            'message': f'Batch renamed to "{new_name}"',
            'batch': BatchSerializer(batch).data
        })
from django.db.models import Count
# from rest_framework import viewsets, permissions, status
# from rest_framework.response import Response
# from rest_framework.decorators import action
# from .models import Image, Batch
# from .serializers import ImageSerializer, BatchSerializer
# import time
# from django.utils import timezone

# # ============ IMAGE VIEWSET ============
# class UserImageView(viewsets.ModelViewSet):
#     serializer_class = ImageSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         return Image.objects.filter(user=self.request.user)

#     def create(self, request, *args, **kwargs):
#         files = request.FILES.getlist('images')
#         batch_name = request.data.get('batch_name', '').strip()
        
#         if not files:
#             return Response(
#                 {'error': 'No images provided'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         images_created = []
#         batch = None
#         is_batch = len(files) > 1
        
#         # Create Batch if multiple files
#         if is_batch:
#             # Auto-generate batch name if not provided
#             if not batch_name:
#                 batch_name = f"Batch {timezone.now().strftime('%b %d, %I:%M %p')}"
            
#             batch = Batch.objects.create(
#                 user=request.user,
#                 name=batch_name
#             )
        
#         # Create each image
#         for i, file in enumerate(files):
#             image = Image.objects.create(
#                 user=request.user,
#                 image=file,
#                 fileName=file.name,
#                 format=file.name.split('.')[-1].lower() if '.' in file.name else '',
#                 ImageSize=file.size,
#                 batch=batch if is_batch else None,
#                 batch_position=i if is_batch else None,
#                 Status='uploaded'
#             )
#             images_created.append(image)
            
#             # Process image
#             self.process_image_async(image)
        
#         # Update batch status
#         if batch:
#             batch.status = 'completed'
#             batch.save()
        
#         # Prepare response
#         serializer = ImageSerializer(images_created, many=True)
        
#         response_data = {
#             'count': len(images_created),
#             'images': serializer.data,
#         }
        
#         if is_batch:
#             response_data.update({
#                 'is_batch': True,
#                 'batch': {
#                     'id': str(batch.BatchID),
#                     'name': batch.name,
#                     'created_at': batch.created_at,
#                     'image_count': len(images_created)
#                 },
#                 'message': f'Batch "{batch.name}" created with {len(files)} images'
#             })
#         else:
#             response_data.update({
#                 'is_batch': False,
#                 'message': 'Single image uploaded successfully'
#             })
        
#         return Response(response_data, status=status.HTTP_201_CREATED)
    
#     def process_image_async(self, image):
#         try:
#             image.Status = 'processing'
#             image.save()
#             time.sleep(2)
#             image.Status = 'completed'
#             image.save()
#         except Exception as e:
#             image.Status = 'failed'
#             image.save()

# ============ BATCH VIEWSET ============
# class BatchViewSet(viewsets.ModelViewSet):
#     serializer_class = BatchSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         return Batch.objects.filter(user=self.request.user)
    
#     @action(detail=True, methods=['get'])
#     def images(self, request, pk=None):
#         batch = self.get_object()
#         images = batch.images.all().order_by('batch_position')
        
#         serializer = ImageSerializer(images, many=True)
        
#         return Response({
#             'batch_id': str(batch.BatchID),
#             'batch_name': batch.name,
#             'created_at': batch.created_at,
#             'total_images': images.count(),
#             'images': serializer.data
#         })
    
#     @action(detail=False, methods=['get'])
#     def search(self, request):
#         search_term = request.query_params.get('name', '').strip()
        
#         if not search_term:
#             return Response(
#                 {'error': 'Please provide a search term'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         batches = Batch.objects.filter(
#             user=request.user,
#             name__icontains=search_term
#         )
        
#         serializer = self.get_serializer(batches, many=True)
        
#         return Response({
#             'search_term': search_term,
#             'count': batches.count(),
#             'results': serializer.data
#         })
    
#     @action(detail=False, methods=['get'])
#     def stats(self, request):
#         batches = self.get_queryset()
        
#         batch_images = Image.objects.filter(
#             user=request.user,
#             batch__isnull=False
#         )
        
#         largest_batch = 0
#         if batches.exists():
#             largest_batch = batches.annotate(
#                 image_count=Count('images')
#             ).order_by('-image_count').first().image_count
        
#         return Response({
#             'total_batches': batches.count(),
#             'total_batch_images': batch_images.count(),
#             'largest_batch': largest_batch,
#             'recent_batches': BatchSerializer(
#                 batches.order_by('-created_at')[:5], 
#                 many=True
#             ).data
#         })
    
#     @action(detail=True, methods=['patch'])
#     def rename(self, request, pk=None):
#         batch = self.get_object()
#         new_name = request.data.get('new_name', '').strip()
        
#         if not new_name:
#             return Response(
#                 {'error': 'new_name is required'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         batch.name = new_name
#         batch.save()
        
#         return Response({
#             'success': True,
#             'message': f'Batch renamed to "{new_name}"',
#             'batch': BatchSerializer(batch).data
#         })
    
#     def destroy(self, request, *args, **kwargs):
#         """
#         DELETE /api/batches/{id}/ - Delete batch and all its images
#         """
#         batch = self.get_object()
#         batch_name = batch.name
#         image_count = batch.images.count()
        
#         # Delete batch (cascade will delete images)
#         batch.delete()
        
#         return Response({
#             'success': True,
#             'message': f'Batch "{batch_name}" deleted with {image_count} images',
#             'batch_name': batch_name,
#             'images_deleted': image_count
#         })

from django.http import Http404
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Image, Batch
from .serializers import ImageSerializer, BatchSerializer
import time
from django.utils import timezone

# ============ BATCH VIEWSET ============
class BatchViewSet(viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Batch.objects.filter(user=self.request.user)
    
    def get_object(self):
        """
        Override get_object to handle UUID properly
        """
        try:
            # Get the pk from the URL
            pk = self.kwargs.get('pk')
            
            # Filter by user and UUID
            queryset = self.filter_queryset(self.get_queryset())
            obj = queryset.get(BatchID=pk)
            
            # May raise a permission denied
            self.check_object_permissions(self.request, obj)
            
            return obj
        except (Batch.DoesNotExist, ValueError):
            raise Http404
    
    @action(detail=True, methods=['get'])
    def images(self, request, pk=None):
        try:
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
        except Http404:
            return Response({
                'error': 'Batch not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
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
        try:
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
        except Http404:
            return Response({
                'error': 'Batch not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/batches/{id}/ - Delete batch and all its images
        """
        try:
            with transaction.atomic():
                batch = self.get_object()
                batch_name = batch.name
                image_count = batch.images.count()
                batch_id = str(batch.BatchID)
                
                # Store data before deletion
                response_data = {
                    'success': True,
                    'message': f'Batch "{batch_name}" deleted with {image_count} images',
                    'batch_id': batch_id,
                    'batch_name': batch_name,
                    'images_deleted': image_count
                }
                
                # Delete batch (cascade will delete images)
                batch.delete()
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Http404:
            return Response({
                'error': 'Batch not found or already deleted'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error deleting batch: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


# ============ IMAGE VIEWSET ============
class UserImageView(viewsets.ModelViewSet):
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Image.objects.filter(user=self.request.user)
    
    def get_object(self):
        """
        Override get_object to handle UUID properly
        """
        try:
            # Get the pk from the URL
            pk = self.kwargs.get('pk')
            
            # Filter by user and UUID
            queryset = self.filter_queryset(self.get_queryset())
            obj = queryset.get(ImageID=pk)
            
            # May raise a permission denied
            self.check_object_permissions(self.request, obj)
            
            return obj
        except (Image.DoesNotExist, ValueError):
            raise Http404

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
        
        try:
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
                
                # Process image (you might want to make this truly async with Celery)
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
            
        except Exception as e:
            # Clean up in case of error
            if batch:
                batch.delete()
            return Response({
                'error': f'Error uploading images: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def process_image_async(self, image):
        try:
            image.Status = 'processing'
            image.save()
            time.sleep(2)  # Simulate processing
            image.Status = 'completed'
            image.save()
        except Exception as e:
            image.Status = 'failed'
            image.save()
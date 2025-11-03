from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Image

@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'image', 'image_type', 'size', 'upload_date')
    list_filter = ('image_type', 'upload_date')
    search_fields = ('user__username',)

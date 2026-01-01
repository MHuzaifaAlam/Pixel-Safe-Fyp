from django.contrib import admin
from .models import ScanReport

@admin.register(ScanReport)
class ScanReportAdmin(admin.ModelAdmin):
    # Columns to show in the list view
    list_display = ('id', 'get_image_id', 'get_filename', 'ai_score', 'verdict', 'user', 'timestamp')
    
    # Enable filters on the right side
    list_filter = ('verdict', 'timestamp', 'user')
    
    # Enable search by User, Filename, or UUID
    search_fields = ('user__username', 'image__fileName', 'image__ImageID')
    
    # Read-only fields (usually you don't want to edit forensic results manually)
    readonly_fields = ('timestamp',)

    # Helper function to show the Image UUID in the list
    def get_image_id(self, obj):
        return obj.image.ImageID
    get_image_id.short_description = 'Image UUID'

    # Helper function to show the Filename from the other table
    def get_filename(self, obj):
        return obj.image.fileName
    get_filename.short_description = 'File Name'
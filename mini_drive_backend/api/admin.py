from django.contrib import admin
from .models import File

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('original_name', 'owner', 'file_size', 'uploaded_at')
    list_filter = ('uploaded_at', 'owner')
    search_fields = ('original_name', 'owner__username')
    readonly_fields = ('uploaded_at', 'file_size', 'original_name')
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('owner')

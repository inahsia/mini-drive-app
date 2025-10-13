from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import os

def validate_file_type(file):
    """Validate that the file is a PDF or image"""
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f'Unsupported file type. Allowed types: {", ".join(allowed_extensions)}')
    
    # File size limit (10MB)
    if file.size > 10 * 1024 * 1024:
        raise ValidationError('File size cannot exceed 10MB')

class File(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    file = models.FileField(upload_to='uploads/', validators=[validate_file_type])
    original_name = models.CharField(max_length=255, default='unknown')
    file_size = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        if self.file:
            self.original_name = self.file.name
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.owner.username} - {self.original_name}'

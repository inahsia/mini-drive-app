from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from .models import File
from .serializers import UserSerializer, FileSerializer, AdminFileSerializer
import os
from django.conf import settings

class UserCreate(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.AllowAny,)

class FileListCreate(generics.ListCreateAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return File.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class FileDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return File.objects.filter(owner=self.request.user)
    
    def perform_update(self, serializer):
        # Get the old file instance
        old_instance = self.get_object()
        
        # Delete the old file from storage if a new file is being uploaded
        if 'file' in self.request.data and old_instance.file:
            if os.path.isfile(old_instance.file.path):
                os.remove(old_instance.file.path)
        
        # Save the new file
        serializer.save(owner=self.request.user)
    
    def perform_destroy(self, instance):
        # Delete the actual file from storage
        if instance.file and os.path.isfile(instance.file.path):
            os.remove(instance.file.path)
        instance.delete()

class AdminFileList(generics.ListAPIView):
    serializer_class = AdminFileSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return File.objects.all().select_related('owner')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_admin_user(request):
    """Create an admin user (only for demo purposes - remove in production)"""
    if request.user.is_superuser:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            admin_user = User.objects.create_user(
                username=username,
                password=password,
                is_staff=True,
                is_superuser=True
            )
            return Response({'message': f'Admin user {username} created successfully'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Only superusers can create admin users'}, status=status.HTTP_403_FORBIDDEN)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """Get user statistics"""
    if request.user.is_staff:
        total_users = User.objects.count()
        total_files = File.objects.count()
        return Response({
            'total_users': total_users,
            'total_files': total_files,
            'is_admin': True
        })
    else:
        user_files_count = File.objects.filter(owner=request.user).count()
        return Response({
            'user_files_count': user_files_count,
            'is_admin': False
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_files(request):
    """Debug endpoint to check user files"""
    user_files = File.objects.filter(owner=request.user)
    files_data = [
        {
            'id': f.id,
            'name': f.original_name,
            'owner': f.owner.username,
            'created_at': f.created_at
        } for f in user_files
    ]
    return Response({
        'user': request.user.username,
        'user_id': request.user.id,
        'files_count': user_files.count(),
        'files': files_data
    })

@api_view(['GET'])
def serve_file(request, file_id):
    """Serve file with authentication (supports both header and query param)"""
    try:
        # Try to get token from header first, then from query parameter
        token = None
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Token '):
            token = auth_header.split(' ')[1]
        elif 'token' in request.GET:
            token = request.GET['token']
        
        if not token:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get user from token
        from rest_framework.authtoken.models import Token as AuthToken
        try:
            auth_token = AuthToken.objects.get(key=token)
            user = auth_token.user
        except AuthToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get the file object
        file_obj = File.objects.get(id=file_id, owner=user)
        
        # Get the file path
        file_path = file_obj.file.path
        
        if not os.path.exists(file_path):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Open and serve the file
        from django.http import HttpResponse, Http404
        import mimetypes
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(file_path)
        if content_type is None:
            content_type = 'application/octet-stream'
        
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{file_obj.original_name}"'
            # Add CORS headers for better compatibility
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET'
            response['Access-Control-Allow-Headers'] = 'Authorization'
            return response
            
    except File.DoesNotExist:
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def replace_file(request, pk):
    """Replace an existing file with a new one"""
    try:
        file_instance = get_object_or_404(File, pk=pk, owner=request.user)
        
        if 'file' not in request.data:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete old file from storage
        if file_instance.file and os.path.isfile(file_instance.file.path):
            os.remove(file_instance.file.path)
        
        # Update with new file
        serializer = FileSerializer(file_instance, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            # Update the uploaded_at timestamp to force cache refresh
            from django.utils import timezone
            file_instance.uploaded_at = timezone.now()
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import File

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'is_staff')
        extra_kwargs = {'password': {'write_only': True, 'required': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class FileSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = File
        fields = ('id', 'file', 'file_url', 'original_name', 'file_size', 'owner', 'owner_username', 'uploaded_at')
        read_only_fields = ('owner', 'original_name', 'file_size')
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

class AdminFileSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = File
        fields = ('id', 'file', 'file_url', 'original_name', 'file_size', 'owner', 'owner_username', 'uploaded_at')
        read_only_fields = ('owner', 'original_name', 'file_size')
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

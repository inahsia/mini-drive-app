from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.UserCreate.as_view(), name='user-create'),
    path('files/', views.FileListCreate.as_view(), name='file-list-create'),
    path('files/<int:pk>/', views.FileDetail.as_view(), name='file-detail'),
    path('files/<int:pk>/replace/', views.replace_file, name='file-replace'),
    path('files/<int:file_id>/serve/', views.serve_file, name='serve-file'),
    path('admin/files/', views.AdminFileList.as_view(), name='admin-file-list'),
    path('admin/create-admin/', views.create_admin_user, name='create-admin'),
    path('stats/', views.user_stats, name='user-stats'),
    path('debug/files/', views.debug_user_files, name='debug-user-files'),
]

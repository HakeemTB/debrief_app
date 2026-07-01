"""Root URL configuration for DebriefPro."""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import CustomTokenObtainPairView, LogoutView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),

    # Users
    path('api/', include('users.urls')),

    # Debriefs, logs, feedback, reports
    path('api/', include('debriefs.urls')),
]

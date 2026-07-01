"""Views for users app: registration, user management, JWT auth."""
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserBasicSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .permissions import IsAdmin, IsAdminOrSupervisor


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint returning JWT pair + user data."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """Public registration endpoint (creates INTERN by default)."""
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """Blacklist the refresh token on logout."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    """Return or update the currently authenticated user's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only viewset for full user CRUD.
    Supervisors can list interns assigned to them.
    """
    queryset = User.objects.all().order_by('username')

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAdminOrSupervisor()]
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_supervisor:
            # Supervisors see all interns in the system
            return User.objects.filter(role=User.Role.INTERN).order_by('username')
        # Admin sees everyone
        return User.objects.all().order_by('username')

    @action(detail=False, methods=['get'], url_path='supervisors')
    def supervisors(self, request):
        """List all supervisors (useful for assigning supervisor to intern)."""
        qs = User.objects.filter(role=User.Role.SUPERVISOR).order_by('username')
        serializer = UserBasicSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='interns')
    def interns(self, request):
        """List interns — filtered by supervisor if caller is a supervisor."""
        if request.user.is_supervisor:
            qs = User.objects.filter(role=User.Role.INTERN)
        else:
            qs = User.objects.filter(role=User.Role.INTERN)
        serializer = UserBasicSerializer(qs.order_by('username'), many=True)
        return Response(serializer.data)

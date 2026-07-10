from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .permissions import IsSuperAdmin


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses=OpenApiResponse(OpenApiTypes.OBJECT, description='JWT access & refresh tokens plus user info.'),
        summary='Log in',
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class RegisterView(APIView):
    # Only an existing super admin may create accounts; bootstrap the first
    # admin with `python manage.py createsuperuser`.
    permission_classes = [IsSuperAdmin]

    @extend_schema(
        request=RegisterSerializer,
        responses=UserSerializer,
        summary='Create a user (super admin only)',
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer, summary='Current authenticated user')
    def get(self, request):
        return Response(UserSerializer(request.user).data)

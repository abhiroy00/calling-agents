from pathlib import Path
from datetime import timedelta
import urllib.parse
import dj_database_url
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-secret-key')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*', cast=Csv())

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'django_celery_beat',
    'apps.accounts',
    'apps.leads',
    'apps.campaigns',
    'apps.calls',
    'apps.analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Use SQLite for local dev if no DATABASE_URL set
_db_url = config('DATABASE_URL', default='')
if _db_url:
    DATABASES = {'default': dj_database_url.parse(_db_url)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'accounts.CustomUser'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'SIGNING_KEY': config('JWT_SECRET', default='dev-jwt-secret'),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = config('FRONTEND_ORIGIN', default='http://localhost:5173', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

if config('CHANNEL_BACKEND', default='redis') == 'memory':
    # Single-process dev fallback (e.g. when local Redis is older than v6).
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }
else:
    _redis_url = config('REDIS_URL', default='redis://localhost:6379/0')
    _r = urllib.parse.urlparse(_redis_url)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [{
                    'host': _r.hostname or 'localhost',
                    'port': _r.port or 6379,
                    'db': int((_r.path or '/0').lstrip('/') or 0),
                    'socket_timeout': None,
                    'socket_connect_timeout': 10,
                }],
                'capacity': 1500,
                'expiry': 60,
            },
        }
    }

CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='amqp://guest:guest@localhost:5672//')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

EXOTEL_SID = config('EXOTEL_SID', default='')
EXOTEL_API_KEY = config('EXOTEL_API_KEY', default='')
EXOTEL_API_SECRET = config('EXOTEL_API_SECRET', default='')
EXOTEL_FROM_NUMBER = config('EXOTEL_FROM_NUMBER', default='')
EXOTEL_APP_ID = config('EXOTEL_APP_ID', default='')
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
OPENAI_REALTIME_MODEL = config('OPENAI_REALTIME_MODEL', default='gpt-realtime')
OPENAI_REALTIME_VOICE = config('OPENAI_REALTIME_VOICE', default='alloy')

# 'openai' = Realtime speaks directly; 'elevenlabs' = Realtime thinks in text,
# ElevenLabs provides the voice (better Hindi/Hinglish quality).
AI_VOICE_PROVIDER = config('AI_VOICE_PROVIDER', default='openai')
ELEVENLABS_API_KEY = config('ELEVENLABS_API_KEY', default='')
ELEVENLABS_VOICE_ID = config('ELEVENLABS_VOICE_ID', default='OtEfb2LVzIE45wdYe54M')
ELEVENLABS_MODEL = config('ELEVENLABS_MODEL', default='eleven_flash_v2_5')
PUBLIC_HOST = config('PUBLIC_HOST', default='localhost:8000')

# Behind the nginx TLS proxy: trust its X-Forwarded-Proto so request.is_secure()
# and admin CSRF checks work over https.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_TRUSTED_ORIGINS = [f'https://{PUBLIC_HOST}']

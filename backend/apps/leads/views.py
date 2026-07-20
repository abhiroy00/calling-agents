from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Lead
from .serializers import LeadSerializer, BulkLeadRowSerializer, BulkUploadResultSerializer


class LeadListView(generics.ListAPIView):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['phone', 'name', 'company', 'email']
    ordering_fields = ['created_at', 'name', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        # ?has_meeting=true powers the Meetings / callbacks page: leads who
        # asked for a callback, demo, or meeting on a call.
        if self.request.query_params.get('has_meeting') in ('true', '1'):
            qs = qs.filter(meeting_requested=True)
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class BulkUploadView(APIView):
    @extend_schema(
        request=BulkLeadRowSerializer(many=True),
        responses=BulkUploadResultSerializer,
        summary='Bulk-create leads',
        description='Accepts a JSON array of lead rows. Skips duplicates (by phone) '
                    'and reports any invalid rows.',
    )
    def post(self, request):
        rows = request.data if isinstance(request.data, list) else request.data.get('leads', [])
        created_count = 0
        dup_count = 0
        invalid_rows = []

        to_create = []
        for i, row in enumerate(rows):
            ser = BulkLeadRowSerializer(data=row)
            if not ser.is_valid():
                invalid_rows.append({'index': i, 'errors': ser.errors, 'row': row})
                continue
            vd = ser.validated_data
            if Lead.objects.filter(phone=vd['phone']).exists():
                dup_count += 1
                continue
            to_create.append(Lead(
                phone=vd['phone'],
                name=vd.get('name', ''),
                company=vd.get('company', ''),
                email=vd.get('email', ''),
                extra_data=vd.get('extra_data', {}),
            ))

        if to_create:
            Lead.objects.bulk_create(to_create)
            created_count = len(to_create)

        return Response({
            'created': created_count,
            'duplicates': dup_count,
            'invalid': invalid_rows,
        }, status=status.HTTP_207_MULTI_STATUS if invalid_rows else status.HTTP_201_CREATED)

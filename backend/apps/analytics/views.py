from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
import datetime
from apps.calls.models import Call


class AnalyticsSummaryView(APIView):
    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        qs = Call.objects.all()
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)

        total = qs.count()
        connected = qs.filter(status='completed').count()
        connect_rate = round(connected / total, 4) if total else 0

        dispositions = dict(
            qs.values('disposition').annotate(n=Count('id')).values_list('disposition', 'n')
        )

        # last 14 days
        since = timezone.now() - datetime.timedelta(days=14)
        calls_per_day = list(
            qs.filter(created_at__gte=since)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
            .values('date', 'count')
        )
        # serialize dates to strings
        for row in calls_per_day:
            row['date'] = str(row['date'])

        avg_duration = qs.filter(status='completed').aggregate(avg=Avg('duration'))['avg'] or 0

        return Response({
            'total_calls': total,
            'connected': connected,
            'connect_rate': connect_rate,
            'avg_duration': round(avg_duration),
            'dispositions': dispositions,
            'calls_per_day': calls_per_day,
        })

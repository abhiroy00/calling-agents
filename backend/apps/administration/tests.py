from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AuditLog, Tenant

User = get_user_model()


class AdminPanelTestBase(APITestCase):
    def setUp(self):
        self.superadmin = User.objects.create_user(
            email='root@example.com', password='rootpass123', name='Root', role='super_admin')
        self.manager = User.objects.create_user(
            email='mgr@example.com', password='mgrpass123', name='Mgr', role='manager')
        self.bd = User.objects.create_user(
            email='bd@example.com', password='bdpass123', name='BD', role='bd_executive')

    def auth(self, user):
        self.client.force_authenticate(user=user)


class UserManagementTests(AdminPanelTestBase):
    def test_super_admin_can_list_users(self):
        self.auth(self.superadmin)
        res = self.client.get('/api/admin/users/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 3)

    def test_non_super_admin_forbidden(self):
        for user in (self.manager, self.bd):
            self.auth(user)
            res = self.client.get('/api/admin/users/')
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_unauthorized(self):
        res = self.client.get('/api/admin/users/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_user_hashes_password_and_can_login(self):
        self.auth(self.superadmin)
        res = self.client.post('/api/admin/users/', {
            'email': 'new@example.com', 'name': 'New', 'role': 'bd_executive',
            'password': 'brandnew123', 'is_active': True,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', res.data)  # write-only, never echoed
        created = User.objects.get(email='new@example.com')
        self.assertTrue(created.check_password('brandnew123'))

    def test_create_requires_password(self):
        self.auth(self.superadmin)
        res = self.client.post('/api/admin/users/', {
            'email': 'nopw@example.com', 'name': 'NoPw', 'role': 'bd_executive',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_role(self):
        self.auth(self.superadmin)
        res = self.client.patch(f'/api/admin/users/{self.bd.id}/', {'role': 'manager'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.bd.refresh_from_db()
        self.assertEqual(self.bd.role, 'manager')

    def test_delete_is_soft_deactivate(self):
        self.auth(self.superadmin)
        res = self.client.delete(f'/api/admin/users/{self.bd.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.bd.refresh_from_db()
        self.assertFalse(self.bd.is_active)          # row survives, just disabled
        self.assertTrue(User.objects.filter(id=self.bd.id).exists())

    def test_search_filter(self):
        self.auth(self.superadmin)
        res = self.client.get('/api/admin/users/?search=mgr@example.com')
        self.assertEqual(res.data['count'], 1)


class TenantTests(AdminPanelTestBase):
    def test_crud_lifecycle(self):
        self.auth(self.superadmin)
        create = self.client.post('/api/admin/tenants/', {
            'name': 'Acme', 'plan': 'growth', 'seats': 10,
            'minutes_quota': 1000, 'minutes_used': 0, 'status': 'active',
        }, format='json')
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        tid = create.data['id']

        patch = self.client.patch(f'/api/admin/tenants/{tid}/', {'status': 'suspended'}, format='json')
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data['status'], 'suspended')

        delete = self.client.delete(f'/api/admin/tenants/{tid}/')
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Tenant.objects.filter(id=tid).exists())

    def test_manager_forbidden(self):
        self.auth(self.manager)
        res = self.client.post('/api/admin/tenants/', {'name': 'X'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class AuditLogTests(AdminPanelTestBase):
    def test_admin_action_writes_audit_entry(self):
        self.auth(self.superadmin)
        self.client.post('/api/admin/users/', {
            'email': 'audited@example.com', 'name': 'A', 'role': 'bd_executive',
            'password': 'auditme12345',
        }, format='json')
        entry = AuditLog.objects.filter(action='user.create').first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor_email, 'root@example.com')
        self.assertEqual(entry.resource, 'audited@example.com')

    def test_audit_list_super_admin_only(self):
        AuditLog.objects.create(actor=self.superadmin, actor_email=self.superadmin.email,
                                action='user.update', resource='x@example.com')
        self.auth(self.superadmin)
        ok = self.client.get('/api/admin/audit/')
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(ok.data['count'], 1)

        self.auth(self.manager)
        forbidden = self.client.get('/api/admin/audit/')
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)


class SystemHealthTests(AdminPanelTestBase):
    def test_manager_can_view_counts_and_services(self):
        self.auth(self.manager)
        res = self.client.get('/api/admin/system/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['counts']['users'], 3)
        self.assertEqual(res.data['counts']['active_users'], 3)
        names = [s['name'] for s in res.data['services']]
        self.assertIn('Database', names)
        db = next(s for s in res.data['services'] if s['name'] == 'Database')
        self.assertEqual(db['status'], 'operational')

    def test_bd_executive_forbidden(self):
        self.auth(self.bd)
        res = self.client.get('/api/admin/system/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class RolesTests(AdminPanelTestBase):
    def test_roles_matrix(self):
        self.auth(self.manager)
        res = self.client.get('/api/admin/roles/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        keys = [r['key'] for r in res.data['roles']]
        self.assertCountEqual(keys, ['super_admin', 'manager', 'bd_executive'])
        # super_admin holds every admin.* permission in the matrix.
        for perm in res.data['permissions']:
            if perm['key'].startswith('admin.'):
                self.assertIn('super_admin', perm['roles'])
        # user_count reflects the DB.
        sa = next(r for r in res.data['roles'] if r['key'] == 'super_admin')
        self.assertEqual(sa['user_count'], 1)

    def test_bd_executive_forbidden(self):
        self.auth(self.bd)
        res = self.client.get('/api/admin/roles/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

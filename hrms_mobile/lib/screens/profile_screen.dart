// lib/screens/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/storage_service.dart';

class ProfileScreen extends StatelessWidget {
  Future<void> _logout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Logout'),
        content: Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFEF4444)),
            child: Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = StorageService.getUser();

    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Profile'),
        backgroundColor: Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header Card
            Container(
              margin: EdgeInsets.all(20),
              padding: EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
              ),
              child: Column(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${user?['first_name']?[0]}${user?['last_name']?[0]}',
                        style: GoogleFonts.inter(
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2563EB)),
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                  Text(
                    '${user?['first_name']} ${user?['last_name']}',
                    style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white),
                  ),
                  SizedBox(height: 4),
                  Text(
                    user?['employee_id'] ?? '',
                    style:
                        GoogleFonts.inter(fontSize: 14, color: Colors.white70),
                  ),
                  SizedBox(height: 8),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      user?['position']?['title'] ?? 'Employee',
                      style:
                          GoogleFonts.inter(fontSize: 12, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),

            // Info Card
            Container(
              margin: EdgeInsets.symmetric(horizontal: 20),
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                children: [
                  _buildInfoRow(
                      Icons.email_outlined, 'Email', user?['email'] ?? '-'),
                  Divider(height: 24, color: Color(0xFFE2E8F0)),
                  _buildInfoRow(
                      Icons.phone_outlined, 'Phone', user?['phone'] ?? '-'),
                  Divider(height: 24, color: Color(0xFFE2E8F0)),
                  _buildInfoRow(Icons.cake_outlined, 'Birth Date',
                      user?['date_of_birth'] ?? '-'),
                  Divider(height: 24, color: Color(0xFFE2E8F0)),
                  _buildInfoRow(Icons.business_outlined, 'Department',
                      user?['department']?['name'] ?? '-'),
                  Divider(height: 24, color: Color(0xFFE2E8F0)),
                  _buildInfoRow(Icons.work_outline, 'Position',
                      user?['position']?['title'] ?? '-'),
                  Divider(height: 24, color: Color(0xFFE2E8F0)),
                  _buildInfoRow(Icons.calendar_today, 'Hire Date',
                      user?['hire_date'] ?? '-'),
                ],
              ),
            ),

            SizedBox(height: 24),

            // Logout Button
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: OutlinedButton(
                onPressed: () => _logout(context),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Color(0xFFEF4444),
                  side: BorderSide(color: Color(0xFFEF4444)),
                  minimumSize: Size(double.infinity, 52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('Logout'),
              ),
            ),

            SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 20, color: Color(0xFF2563EB)),
        ),
        SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 12, color: Color(0xFF94A3B8))),
              Text(value,
                  style: GoogleFonts.inter(
                      fontSize: 14, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }
}

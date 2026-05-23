// lib/widgets/bottom_nav_bar.dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final bool isManager;

  const BottomNavBar({
    Key? key,
    required this.currentIndex,
    required this.onTap,
    this.isManager = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                  Icons.dashboard_outlined, Icons.dashboard, 'Home', 0),
              _buildNavItem(
                  Icons.beach_access_outlined, Icons.beach_access, 'Leave', 1),
              _buildNavItem(Icons.swap_horiz, Icons.swap_horiz, 'Replace', 2),
              if (isManager) ...[
                _buildNavItem(
                    Icons.analytics_outlined, Icons.analytics, 'Reports', 3),
                _buildNavItem(Icons.pending_actions_outlined,
                    Icons.pending_actions, 'Requests', 4),
              ],
              _buildNavItem(Icons.person_outline, Icons.person, 'Profile',
                  isManager ? 5 : 3),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
      IconData icon, IconData activeIcon, String label, int index) {
    final isActive = currentIndex == index;
    return GestureDetector(
      onTap: () => onTap(index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isActive ? activeIcon : icon,
            color: isActive ? Color(0xFF2563EB) : Color(0xFF94A3B8),
            size: 24,
          ),
          SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              color: isActive ? Color(0xFF2563EB) : Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }
}

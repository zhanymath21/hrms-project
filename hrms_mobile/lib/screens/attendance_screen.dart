// lib/screens/attendance_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import '../providers/attendance_provider.dart';
import '../utils/helpers.dart';

class AttendanceScreen extends StatefulWidget {
  @override
  _AttendanceScreenState createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with SingleTickerProviderStateMixin {
  Position? _currentPosition;
  String? _locationError;
  File? _selfieImage;
  bool _isLoadingLocation = false;
  bool _isTakingPhoto = false;
  late AnimationController _animationController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _animationController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _locationError = 'GPS is disabled';
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) {
        _locationError = 'Location permission denied';
        return;
      }

      _currentPosition = await Geolocator.getCurrentPosition();
    } catch (e) {
      _locationError = 'Unable to get location';
    } finally {
      setState(() => _isLoadingLocation = false);
    }
  }

  Future<void> _takeSelfie() async {
    setState(() => _isTakingPhoto = true);
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 800,
        imageQuality: 80,
        preferredCameraDevice: CameraDevice.front,
      );
      if (photo != null) {
        setState(() => _selfieImage = File(photo.path));
        _showConfirmDialog();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.white),
              SizedBox(width: 12),
              Text('Failed to open camera'),
            ],
          ),
          backgroundColor: Colors.red.shade400,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } finally {
      setState(() => _isTakingPhoto = false);
    }
  }

  void _showConfirmDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          padding: EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Color(0xFF667EEA), width: 3),
                ),
                child: ClipOval(
                  child: Image.file(_selfieImage!,
                      height: 120, width: 120, fit: BoxFit.cover),
                ),
              ),
              SizedBox(height: 20),
              Text(
                'Confirm Check In',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A202C),
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Is this selfie clear and recognizable?',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: Color(0xFF718096),
                ),
              ),
              SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        setState(() => _selfieImage = null);
                      },
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text('Retake',
                          style: TextStyle(color: Color(0xFF718096))),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _checkIn();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Color(0xFF10B981),
                        padding: EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text('Confirm'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _checkIn() async {
    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.gps_off, color: Colors.white),
              SizedBox(width: 12),
              Text('Please enable GPS and location permission'),
            ],
          ),
          backgroundColor: Colors.red.shade400,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final provider = Provider.of<AttendanceProvider>(context, listen: false);
    String? photoBase64 = await Helpers.imageToBase64(_selfieImage!);
    bool success = await provider.checkIn(
      latitude: _currentPosition!.latitude,
      longitude: _currentPosition!.longitude,
      photoBase64: photoBase64,
    );

    if (success) {
      setState(() => _selfieImage = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Text('Check-in successful! Have a great day!'),
            ],
          ),
          backgroundColor: Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AttendanceProvider>(
      builder: (context, provider, child) {
        final today = provider.todayAttendance;

        return Scaffold(
          body: RefreshIndicator(
            onRefresh: provider.loadTodayAttendance,
            child: CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 120,
                  floating: true,
                  pinned: true,
                  backgroundColor: Colors.transparent,
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text(
                      'Attendance',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1A202C),
                      ),
                    ),
                    background: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color(0xFF667EEA),
                            Color(0xFF764BA2),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.all(20),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Live Time Card with Animation
                      AnimatedBuilder(
                        animation: _animationController,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: _pulseAnimation.value,
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    Color(0xFF667EEA),
                                    Color(0xFF764BA2),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(30),
                                boxShadow: [
                                  BoxShadow(
                                    color: Color(0xFF667EEA).withOpacity(0.3),
                                    blurRadius: 20,
                                    offset: Offset(0, 10),
                                  ),
                                ],
                              ),
                              padding: EdgeInsets.all(24),
                              child: Column(
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.access_time,
                                          color: Colors.white, size: 28),
                                      SizedBox(width: 12),
                                      Text(
                                        Helpers.getCurrentTime(),
                                        style: GoogleFonts.orbitron(
                                          fontSize: 36,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                          letterSpacing: 2,
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.calendar_today,
                                          color: Colors.white70, size: 18),
                                      SizedBox(width: 8),
                                      Text(
                                        Helpers.formatDate(DateTime.now()),
                                        style: GoogleFonts.inter(
                                          fontSize: 16,
                                          color: Colors.white70,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      SizedBox(height: 20),

                      // Stats Cards Row
                      Row(
                        children: [
                          Expanded(
                            child: _buildModernStatCard(
                              'Total Hours',
                              '${today?['attendance']?['total_hours'] ?? 0}h',
                              Icons.access_time_filled,
                              Color(0xFF667EEA),
                              Color(0xFFE0E7FF),
                            ),
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: _buildModernStatCard(
                              'Sessions',
                              '${today?['attendance']?['total_sessions'] ?? 0}/2',
                              Icons.history_edu,
                              Color(0xFF10B981),
                              Color(0xFFD1FAE5),
                            ),
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: _buildModernStatCard(
                              'Overtime',
                              '${today?['attendance']?['overtime_hours'] ?? 0}h',
                              Icons.timer_outlined,
                              Color(0xFFF59E0B),
                              Color(0xFFFEF3C7),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 20),

                      // Status Card with Animation
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.1),
                              blurRadius: 10,
                              offset: Offset(0, 5),
                            ),
                          ],
                        ),
                        padding: EdgeInsets.all(16),
                        child: Row(
                          children: [
                            AnimatedContainer(
                              duration: Duration(milliseconds: 500),
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color:
                                    today?['attendance']?['status'] == 'present'
                                        ? Color(0xFF10B981)
                                        : today?['attendance']?['status'] ==
                                                'check_in'
                                            ? Color(0xFFF59E0B)
                                            : Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Status:',
                              style: GoogleFonts.inter(
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            SizedBox(width: 8),
                            Text(
                              today?['attendance']?['status']?.toUpperCase() ??
                                  'NOT STARTED',
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600,
                                color:
                                    today?['attendance']?['status'] == 'present'
                                        ? Color(0xFF10B981)
                                        : today?['attendance']?['status'] ==
                                                'check_in'
                                            ? Color(0xFFF59E0B)
                                            : Color(0xFFEF4444),
                              ),
                            ),
                            Spacer(),
                            if (_currentPosition != null)
                              Container(
                                padding: EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Color(0xFFD1FAE5),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.gps_fixed,
                                        size: 14, color: Color(0xFF10B981)),
                                    SizedBox(width: 4),
                                    Text(
                                      'GPS Ready',
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF10B981),
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else if (_isLoadingLocation)
                              SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                          ],
                        ),
                      ),
                      SizedBox(height: 20),

                      // Animated Action Button
                      if (provider.canCheckIn && _selfieImage == null)
                        AnimatedContainer(
                          duration: Duration(milliseconds: 300),
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Color(0xFF667EEA).withOpacity(0.4),
                                blurRadius: 15,
                                offset: Offset(0, 5),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: _isTakingPhoto ? null : _takeSelfie,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: _isTakingPhoto
                                  ? [
                                      SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                  Colors.white),
                                        ),
                                      ),
                                      SizedBox(width: 12),
                                      Text(
                                        'Opening Camera...',
                                        style: GoogleFonts.inter(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ]
                                  : [
                                      Icon(Icons.camera_alt,
                                          color: Colors.white),
                                      SizedBox(width: 8),
                                      Text(
                                        'Check In with Selfie',
                                        style: GoogleFonts.inter(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                            ),
                          ),
                        ),

                      if (provider.canCheckOut)
                        AnimatedContainer(
                          duration: Duration(milliseconds: 300),
                          height: 56,
                          child: OutlinedButton(
                            onPressed: provider.checkOut,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Color(0xFFF59E0B),
                              side: BorderSide(
                                  color: Color(0xFFF59E0B), width: 2),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.logout),
                                SizedBox(width: 8),
                                Text(
                                  'Check Out',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      // Sessions List
                      if (today?['attendance']?['sessions'] != null &&
                          today!['attendance']['sessions'].isNotEmpty)
                        ..._buildModernSessionsList(
                            today['attendance']['sessions']),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModernStatCard(
      String label, String value, IconData icon, Color color, Color bgColor) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A202C),
            ),
          ),
          SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: Color(0xFF718096),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildModernSessionsList(List sessions) {
    return [
      SizedBox(height: 20),
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              blurRadius: 10,
              offset: Offset(0, 5),
            ),
          ],
        ),
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.history, color: Color(0xFF667EEA), size: 24),
                SizedBox(width: 12),
                Text(
                  'Today\'s Sessions',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A202C),
                  ),
                ),
              ],
            ),
            SizedBox(height: 20),
            ...sessions.map((session) => Container(
                  margin: EdgeInsets.only(bottom: 16),
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFFF8FAFC),
                        Colors.white,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Text(
                            '${session['session_number']}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Session ${session['session_number']}',
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(Icons.login,
                                    size: 12, color: Color(0xFF718096)),
                                SizedBox(width: 4),
                                Text(
                                  'In: ${session['check_in_time']}',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: Color(0xFF718096),
                                  ),
                                ),
                                if (session['check_out_time'] != null) ...[
                                  SizedBox(width: 8),
                                  Icon(Icons.logout,
                                      size: 12, color: Color(0xFF718096)),
                                  SizedBox(width: 4),
                                  Text(
                                    'Out: ${session['check_out_time']}',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: Color(0xFF718096),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (session['is_late'] == true)
                        Container(
                          padding:
                              EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: Color(0xFFF59E0B).withOpacity(0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.access_time,
                                  size: 12, color: Color(0xFFD97706)),
                              SizedBox(width: 4),
                              Text(
                                '${session['late_minutes']}m late',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFFD97706),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    ];
  }
}

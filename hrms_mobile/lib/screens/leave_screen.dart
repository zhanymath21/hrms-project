// lib/screens/leave_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/leave_provider.dart';
import '../widgets/loading_widget.dart';
import '../utils/helpers.dart';

class LeaveScreen extends StatefulWidget {
  @override
  _LeaveScreenState createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  bool _showRequestForm = false;
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;

  final _formKey = GlobalKey<FormState>();
  int? _selectedLeaveTypeId;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _animationController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 500),
    );
    _slideAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _animationController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  // ==================== HELPER METHODS ====================

  /// Safe conversion to double
  double _toDouble(dynamic value, {double defaultValue = 0.0}) {
    if (value == null) return defaultValue;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      return double.tryParse(value) ?? defaultValue;
    }
    return defaultValue;
  }

  /// Safe conversion to int
  int _toInt(dynamic value, {int defaultValue = 0}) {
    if (value == null) return defaultValue;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) {
      return int.tryParse(value) ?? defaultValue;
    }
    return defaultValue;
  }

  /// Safe division
  double _safeDivide(dynamic dividend, dynamic divisor,
      {double defaultValue = 0.0}) {
    final numDividend = _toDouble(dividend);
    final numDivisor = _toDouble(divisor, defaultValue: 1.0);
    if (numDivisor == 0) return defaultValue;
    return numDividend / numDivisor;
  }

  // ==================== MAIN METHODS ====================

  Future<void> _submitLeave() async {
    if (_formKey.currentState!.validate()) {
      final provider = Provider.of<LeaveProvider>(context, listen: false);
      bool success = await provider.createLeave(
        leaveTypeId: _selectedLeaveTypeId!,
        startDate: DateFormat('yyyy-MM-dd').format(_startDate!),
        endDate: DateFormat('yyyy-MM-dd').format(_endDate!),
        reason: _reasonController.text,
      );

      if (success) {
        setState(() {
          _showRequestForm = false;
          _selectedLeaveTypeId = null;
          _startDate = null;
          _endDate = null;
          _reasonController.clear();
        });
        _animationController.reverse();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Expanded(child: Text('Leave request submitted successfully!')),
              ],
            ),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  Future<void> _cancelLeave(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Cancel Request'),
        content: Text('Are you sure you want to cancel this leave request?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child:
                Text('No', style: GoogleFonts.inter(color: Color(0xFF718096))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Color(0xFFEF4444),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final provider = Provider.of<LeaveProvider>(context, listen: false);
      await provider.cancelLeave(id);
      await provider.loadLeaves(refresh: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Leave request cancelled successfully'),
              ],
            ),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  void _showLeaveDetail(Map<String, dynamic> leave) {
    showModalBottomSheet(
      context: context,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            SizedBox(height: 20),
            Text(
              'Leave Details',
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 20),
            _buildDetailRow('Leave Type', leave['leave_type']['name'] ?? ''),
            _buildDetailRow('Duration',
                '${leave['start_date'] ?? ''} - ${leave['end_date'] ?? ''} (${_toInt(leave['total_days'])} days)'),
            _buildDetailRow('Reason', leave['reason'] ?? ''),
            _buildDetailRow('Status', (leave['status'] ?? '').toUpperCase()),
            if (leave['rejection_reason'] != null)
              _buildDetailRow('Rejection Reason', leave['rejection_reason']),
            SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // ==================== BUILD METHODS ====================

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);

    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFF8FAFC),
                  Color(0xFFF1F5F9),
                ],
              ),
            ),
          ),
          leaveProvider.isLoading
              ? LoadingWidget()
              : _showRequestForm
                  ? _buildRequestForm()
                  : Column(
                      children: [
                        // Custom App Bar
                        Container(
                          padding:
                              EdgeInsets.only(top: 40, left: 20, right: 20),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Leave Management',
                                    style: GoogleFonts.poppins(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1A202C),
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Manage your leave requests',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: Color(0xFF718096),
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Color(0xFF667EEA),
                                      Color(0xFF764BA2)
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: IconButton(
                                  icon: Icon(Icons.add, color: Colors.white),
                                  onPressed: () {
                                    setState(() => _showRequestForm = true);
                                    _animationController.forward();
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(height: 20),
                        // Tab Bar
                        Container(
                          margin: EdgeInsets.symmetric(horizontal: 20),
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
                          child: TabBar(
                            controller: _tabController,
                            tabs: [
                              Tab(
                                icon:
                                    Icon(Icons.account_balance_wallet_outlined),
                                text: 'Balance',
                              ),
                              Tab(
                                icon: Icon(Icons.history),
                                text: 'History',
                              ),
                            ],
                            labelColor: Color(0xFF667EEA),
                            unselectedLabelColor: Color(0xFF94A3B8),
                            indicator: BoxDecoration(
                              color: Color(0xFF667EEA).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            indicatorSize: TabBarIndicatorSize.tab,
                          ),
                        ),
                        Expanded(
                          child: TabBarView(
                            controller: _tabController,
                            children: [
                              _buildBalanceTab(leaveProvider),
                              _buildHistoryTab(leaveProvider),
                            ],
                          ),
                        ),
                      ],
                    ),
        ],
      ),
    );
  }

  Widget _buildBalanceTab(LeaveProvider provider) {
    final balances = provider.leaveBalances;

    if (balances.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.account_balance_wallet,
                size: 80, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text('No leave balance data',
                style:
                    GoogleFonts.inter(fontSize: 16, color: Color(0xFF64748B))),
            SizedBox(height: 8),
            Text('Please contact HR',
                style:
                    GoogleFonts.inter(fontSize: 14, color: Color(0xFF94A3B8))),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: provider.loadLeaveBalances,
      child: ListView.builder(
        padding: EdgeInsets.all(20),
        itemCount: balances.length,
        itemBuilder: (context, index) {
          final balance = balances[index];

          // Safe calculations with helper methods
          final usedDays = _toDouble(balance['used_days']);
          final totalEntitlement =
              _toDouble(balance['total_entitlement'], defaultValue: 1.0);
          final percentage =
              totalEntitlement > 0 ? (usedDays / totalEntitlement) * 100 : 0.0;

          final color = _getLeaveColor(balance['leave_code']);

          // Safe value for progress indicator
          final progressValue = percentage.isFinite && percentage >= 0
              ? (percentage / 100).clamp(0.0, 1.0)
              : 0.0;

          return AnimatedContainer(
            duration: Duration(milliseconds: 300),
            margin: EdgeInsets.only(bottom: 16),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    blurRadius: 10,
                    offset: Offset(0, 5),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Progress indicator background
                  ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: LinearProgressIndicator(
                      value: progressValue,
                      backgroundColor: Colors.transparent,
                      color: color.withOpacity(0.1),
                      minHeight: double.infinity,
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [color, color.withOpacity(0.7)],
                                    ),
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: color.withOpacity(0.3),
                                        blurRadius: 10,
                                        offset: Offset(0, 5),
                                      ),
                                    ],
                                  ),
                                  child: Icon(
                                    _getLeaveIcon(balance['leave_code']),
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                ),
                                SizedBox(width: 16),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      balance['leave_type'] ?? '',
                                      style: GoogleFonts.poppins(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 18,
                                        color: Color(0xFF1A202C),
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Container(
                                      padding: EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: color.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        balance['leave_code'] ?? '',
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: color,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Container(
                              padding: EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [color, color.withOpacity(0.8)],
                                ),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    '${_toInt(balance['remaining_days'])}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    'Days Left',
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      color: Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildModernStatItem(
                              'Total',
                              '${_toInt(balance['total_entitlement'])}',
                              Icons.assignment_outlined,
                              Color(0xFF64748B),
                            ),
                            Container(
                                width: 1, height: 30, color: Color(0xFFE2E8F0)),
                            _buildModernStatItem(
                              'Used',
                              '${_toInt(balance['used_days'])}',
                              Icons.remove_circle_outline,
                              Color(0xFFEF4444),
                            ),
                            Container(
                                width: 1, height: 30, color: Color(0xFFE2E8F0)),
                            _buildModernStatItem(
                              'Remaining',
                              '${_toInt(balance['remaining_days'])}',
                              Icons.check_circle_outline,
                              color,
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: LinearProgressIndicator(
                            value: progressValue,
                            backgroundColor: Color(0xFFE2E8F0),
                            color: color,
                            minHeight: 8,
                          ),
                        ),
                        if ((_toInt(balance['seniority_bonus']) > 0) ||
                            (_toInt(balance['carry_forward']) > 0))
                          Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (_toInt(balance['seniority_bonus']) > 0)
                                  _buildBonusChip(
                                    '🎁 +${_toInt(balance['seniority_bonus'])} Seniority Bonus',
                                    Color(0xFF10B981),
                                  ),
                                if (_toInt(balance['carry_forward']) > 0)
                                  _buildBonusChip(
                                    '📦 +${_toInt(balance['carry_forward'])} Carry Forward',
                                    Color(0xFFF59E0B),
                                  ),
                                if (_toInt(balance['replacement_days']) > 0)
                                  _buildBonusChip(
                                    '🔄 +${_toInt(balance['replacement_days'])} Replacement Days',
                                    Color(0xFF8B5CF6),
                                  ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildModernStatItem(
      String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            color: Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }

  Widget _buildBonusChip(String label, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildHistoryTab(LeaveProvider provider) {
    final leaves = provider.leaves;

    if (leaves.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 80, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text('No leave history',
                style:
                    GoogleFonts.inter(fontSize: 16, color: Color(0xFF64748B))),
            SizedBox(height: 8),
            Text('Your leave requests will appear here',
                style:
                    GoogleFonts.inter(fontSize: 14, color: Color(0xFF94A3B8))),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadLeaves(refresh: true),
      child: ListView.builder(
        padding: EdgeInsets.all(20),
        itemCount: leaves.length,
        itemBuilder: (context, index) {
          final leave = leaves[index];
          final status = leave['status'] ?? 'pending';
          final statusColor = status == 'approved'
              ? Color(0xFF10B981)
              : status == 'rejected'
                  ? Color(0xFFEF4444)
                  : Color(0xFFF59E0B);

          final statusIcon = status == 'approved'
              ? Icons.check_circle
              : status == 'rejected'
                  ? Icons.cancel
                  : Icons.pending;

          return AnimatedContainer(
            duration: Duration(milliseconds: 300),
            margin: EdgeInsets.only(bottom: 12),
            child: Container(
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
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => _showLeaveDetail(leave),
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          _getLeaveColor(
                                              leave['leave_type']?['code']),
                                          _getLeaveColor(
                                                  leave['leave_type']?['code'])
                                              .withOpacity(0.7),
                                        ],
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Icon(
                                      _getLeaveIcon(
                                          leave['leave_type']?['code']),
                                      color: Colors.white,
                                      size: 24,
                                    ),
                                  ),
                                  SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          leave['leave_type']?['name'] ?? '',
                                          style: GoogleFonts.poppins(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 16,
                                            color: Color(0xFF1A202C),
                                          ),
                                        ),
                                        SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Icon(Icons.calendar_today,
                                                size: 12,
                                                color: Color(0xFF94A3B8)),
                                            SizedBox(width: 4),
                                            Text(
                                              '${leave['start_date'] ?? ''} → ${leave['end_date'] ?? ''}',
                                              style: GoogleFonts.inter(
                                                fontSize: 11,
                                                color: Color(0xFF718096),
                                              ),
                                            ),
                                            SizedBox(width: 8),
                                            Container(
                                              width: 4,
                                              height: 4,
                                              decoration: BoxDecoration(
                                                color: Color(0xFF94A3B8),
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                            SizedBox(width: 8),
                                            Icon(Icons.numbers,
                                                size: 12,
                                                color: Color(0xFF94A3B8)),
                                            SizedBox(width: 4),
                                            Text(
                                              '${_toInt(leave['total_days'])} days',
                                              style: GoogleFonts.inter(
                                                fontSize: 11,
                                                color: Color(0xFF718096),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(statusIcon,
                                      color: statusColor, size: 14),
                                  SizedBox(width: 4),
                                  Text(
                                    status.toUpperCase(),
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: statusColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 12),
                        Container(
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.description_outlined,
                                  size: 16, color: Color(0xFF718096)),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  leave['reason'] ?? '',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    color: Color(0xFF475569),
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (status == 'pending')
                          Padding(
                            padding: EdgeInsets.only(top: 12),
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: OutlinedButton.icon(
                                onPressed: () =>
                                    _cancelLeave(_toInt(leave['id'])),
                                icon: Icon(Icons.cancel_outlined, size: 16),
                                label: Text('Cancel Request'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Color(0xFFEF4444),
                                  side: BorderSide(color: Color(0xFFEF4444)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (status == 'rejected' &&
                            leave['rejection_reason'] != null)
                          Padding(
                            padding: EdgeInsets.only(top: 12),
                            child: Container(
                              padding: EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Color(0xFFFEE2E2)),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.error_outline,
                                      size: 16, color: Color(0xFFEF4444)),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Rejected: ${leave['rejection_reason']}',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        color: Color(0xFFEF4444),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: Color(0xFF718096),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1A202C),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestForm() {
    final leaveTypes = [
      {
        'id': 1,
        'name': 'Annual Leave',
        'code': 'AL',
        'color': 0xFF667EEA,
        'icon': Icons.beach_access
      },
      {
        'id': 2,
        'name': 'Sick Leave',
        'code': 'SL',
        'color': 0xFF10B981,
        'icon': Icons.local_hospital
      },
      {
        'id': 3,
        'name': 'Special Leave',
        'code': 'SPL',
        'color': 0xFFF59E0B,
        'icon': Icons.celebration
      },
    ];

    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(
              0, _slideAnimation.value * MediaQuery.of(context).size.height),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
              ),
            ),
            child: Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                leading: IconButton(
                  icon: Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () {
                    setState(() => _showRequestForm = false);
                    _animationController.reverse();
                  },
                ),
                title: Text(
                  'Request Leave',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              body: SingleChildScrollView(
                padding: EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      Container(
                        padding: EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          children: [
                            // Leave Type Selection
                            Container(
                              decoration: BoxDecoration(
                                color: Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                children: leaveTypes.map((type) {
                                  final isSelected =
                                      _selectedLeaveTypeId == type['id'];
                                  return GestureDetector(
                                    onTap: () => setState(() =>
                                        _selectedLeaveTypeId =
                                            type['id'] as int),
                                    child: Container(
                                      padding: EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? Color(0xFF667EEA).withOpacity(0.1)
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 48,
                                            height: 48,
                                            decoration: BoxDecoration(
                                              gradient: LinearGradient(
                                                colors: [
                                                  Color(type['color'] as int),
                                                  Color(type['color'] as int)
                                                      .withOpacity(0.7),
                                                ],
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(16),
                                            ),
                                            child: Icon(
                                                type['icon'] as IconData,
                                                color: Colors.white),
                                          ),
                                          SizedBox(width: 16),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  type['name'] as String,
                                                  style: GoogleFonts.poppins(
                                                    fontWeight: FontWeight.w600,
                                                    color: Color(0xFF1A202C),
                                                  ),
                                                ),
                                                Text(
                                                  type['code'] as String,
                                                  style: GoogleFonts.inter(
                                                    fontSize: 12,
                                                    color: Color(0xFF718096),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          if (isSelected)
                                            Icon(Icons.check_circle,
                                                color: Color(0xFF667EEA)),
                                        ],
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                            SizedBox(height: 20),

                            // Date Range
                            Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () async {
                                      final date = await showDatePicker(
                                        context: context,
                                        initialDate: DateTime.now(),
                                        firstDate: DateTime.now(),
                                        lastDate: DateTime.now()
                                            .add(Duration(days: 365)),
                                      );
                                      if (date != null)
                                        setState(() => _startDate = date);
                                    },
                                    child: Container(
                                      padding: EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Column(
                                        children: [
                                          Icon(Icons.calendar_today,
                                              size: 20,
                                              color: Color(0xFF667EEA)),
                                          SizedBox(height: 8),
                                          Text(
                                            _startDate != null
                                                ? Helpers.formatDate(
                                                    _startDate!)
                                                : 'Start Date',
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                              color: _startDate != null
                                                  ? Color(0xFF1A202C)
                                                  : Color(0xFF94A3B8),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                SizedBox(width: 12),
                                Icon(Icons.arrow_forward,
                                    color: Color(0xFF667EEA)),
                                SizedBox(width: 12),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () async {
                                      final date = await showDatePicker(
                                        context: context,
                                        initialDate:
                                            _startDate ?? DateTime.now(),
                                        firstDate: _startDate ?? DateTime.now(),
                                        lastDate: DateTime.now()
                                            .add(Duration(days: 365)),
                                      );
                                      if (date != null)
                                        setState(() => _endDate = date);
                                    },
                                    child: Container(
                                      padding: EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Column(
                                        children: [
                                          Icon(Icons.calendar_today,
                                              size: 20,
                                              color: Color(0xFF667EEA)),
                                          SizedBox(height: 8),
                                          Text(
                                            _endDate != null
                                                ? Helpers.formatDate(_endDate!)
                                                : 'End Date',
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                              color: _endDate != null
                                                  ? Color(0xFF1A202C)
                                                  : Color(0xFF94A3B8),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 20),

                            // Reason
                            TextFormField(
                              controller: _reasonController,
                              decoration: InputDecoration(
                                labelText: 'Reason for Leave',
                                labelStyle:
                                    GoogleFonts.inter(color: Color(0xFF718096)),
                                hintText:
                                    'Please provide a reason for your leave request',
                                hintStyle: GoogleFonts.inter(fontSize: 13),
                                prefixIcon: Icon(Icons.description_outlined,
                                    color: Color(0xFF667EEA)),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide:
                                      BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide:
                                      BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(
                                      color: Color(0xFF667EEA), width: 2),
                                ),
                              ),
                              maxLines: 4,
                              validator: (v) => v == null || v.isEmpty
                                  ? 'Please enter a reason'
                                  : null,
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 20),

                      // Submit Button
                      Container(
                        width: double.infinity,
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
                          onPressed: _submitLeave,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ),
                          child: Text(
                            'Submit Request',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ==================== HELPER METHODS FOR COLORS & ICONS ====================

  Color _getLeaveColor(String? code) {
    switch (code?.toUpperCase()) {
      case 'AL':
        return Color(0xFF667EEA);
      case 'SL':
        return Color(0xFF10B981);
      case 'SPL':
        return Color(0xFFF59E0B);
      default:
        return Color(0xFF8B5CF6);
    }
  }

  IconData _getLeaveIcon(String? code) {
    switch (code?.toUpperCase()) {
      case 'AL':
        return Icons.beach_access;
      case 'SL':
        return Icons.local_hospital;
      case 'SPL':
        return Icons.celebration;
      default:
        return Icons.event;
    }
  }
}

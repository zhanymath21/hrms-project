// lib/screens/report_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../providers/report_provider.dart';
import '../widgets/loading_widget.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({Key? key}) : super(key: key);

  @override
  _ReportScreenState createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DateTime _selectedDate = DateTime.now();
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadReports();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadReports() async {
    final reportProvider = Provider.of<ReportProvider>(context, listen: false);
    try {
      await Future.wait([
        reportProvider.loadAttendanceReport(date: _selectedDate),
        reportProvider.loadMonthlyAttendanceReport(
            month: _selectedMonth, year: _selectedYear),
        reportProvider.loadLeaveReport(
            month: _selectedMonth, year: _selectedYear),
        reportProvider.loadLeaveBalanceReport(),
      ]);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading reports: $e')),
        );
      }
    }
  }

  Future<void> _refreshReports() async {
    final reportProvider = Provider.of<ReportProvider>(context, listen: false);
    try {
      await Future.wait([
        reportProvider.loadAttendanceReport(date: _selectedDate),
        reportProvider.loadMonthlyAttendanceReport(
            month: _selectedMonth, year: _selectedYear),
        reportProvider.loadLeaveReport(
            month: _selectedMonth, year: _selectedYear),
        reportProvider.loadLeaveBalanceReport(),
      ]);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error refreshing reports: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    final isManager =
        user?['position']?['title']?.contains('Manager') == true ||
            user?['position']?['title']?.contains('HR') == true ||
            user?['position']?['title']?.contains('Admin') == true;

    if (!isManager) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: const Text('Reports'),
          backgroundColor: const Color(0xFFF8FAFC),
          elevation: 0,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline,
                  size: 64, color: Color(0xFF94A3B8)),
              const SizedBox(height: 16),
              Text(
                'Access Restricted',
                style: GoogleFonts.inter(
                    fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Only managers and HR can view reports',
                style: GoogleFonts.inter(color: const Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Reports'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Attendance', icon: Icon(Icons.analytics_outlined)),
            Tab(text: 'Monthly', icon: Icon(Icons.calendar_month)),
            Tab(text: 'Leave', icon: Icon(Icons.bar_chart_outlined)),
          ],
          labelColor: const Color(0xFF2563EB),
          unselectedLabelColor: const Color(0xFF94A3B8),
          indicatorColor: const Color(0xFF2563EB),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshReports,
        child: Consumer<ReportProvider>(
          builder: (context, provider, child) {
            if (provider.isLoading) {
              return const LoadingWidget();
            }

            return TabBarView(
              controller: _tabController,
              children: [
                _buildDailyAttendanceTab(provider),
                _buildMonthlyAttendanceTab(provider),
                _buildLeaveTab(provider),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildDailyAttendanceTab(ReportProvider provider) {
    final report = provider.attendanceReport;

    if (report == null) {
      return const Center(child: Text('No data available'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Date Selector
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: GestureDetector(
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2024),
                  lastDate: DateTime.now(),
                );
                if (date != null) {
                  setState(() {
                    _selectedDate = date;
                  });
                  await provider.loadAttendanceReport(date: date);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.calendar_today,
                        size: 16, color: Color(0xFF64748B)),
                    const SizedBox(width: 8),
                    Text(
                      DateFormat('dd MMM yyyy').format(_selectedDate),
                      style: GoogleFonts.inter(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Summary Cards
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Present',
                  _formatNumber(report['present']),
                  Icons.check_circle,
                  const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Absent',
                  _formatNumber(report['absent']),
                  Icons.cancel,
                  const Color(0xFFEF4444),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Late',
                  _formatNumber(report['late']),
                  Icons.access_time,
                  const Color(0xFFF59E0B),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Total Hours',
                  _formatNumber(report['total_hours']),
                  Icons.timer,
                  const Color(0xFF8B5CF6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Employee List
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Employee Details',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                ...(report['employees'] as List? ?? []).map<Widget>((employee) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: const Color(0xFFEFF6FF),
                          child: Text(
                            employee['name']?.substring(0, 1) ?? '?',
                            style: const TextStyle(color: Color(0xFF2563EB)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(employee['name'] ?? '-',
                                  style: GoogleFonts.inter(
                                      fontWeight: FontWeight.w500)),
                              Text(employee['employee_id'] ?? '-',
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color: const Color(0xFF64748B))),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getStatusColor(employee['status'])
                                .withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            employee['status']?.toUpperCase() ?? '-',
                            style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: _getStatusColor(employee['status'])),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          employee['check_in'] ?? '-',
                          style: GoogleFonts.inter(
                              fontSize: 12, color: const Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthlyAttendanceTab(ReportProvider provider) {
    final report = provider.monthlyAttendanceReport;

    if (report == null) {
      return const Center(child: Text('No data available'));
    }

    final workingDays = _parseNumber(report['working_days']);
    final presentDays = _parseNumber(report['present_days']);
    final attendanceRate = workingDays > 0 ? (presentDays / workingDays) : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Month/Year Selector
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    final month = await _showMonthPicker();
                    if (month != null) {
                      setState(() {
                        _selectedMonth = month;
                      });
                      await provider.loadMonthlyAttendanceReport(
                          month: _selectedMonth, year: _selectedYear);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.calendar_month,
                            size: 16, color: Color(0xFF64748B)),
                        const SizedBox(width: 8),
                        Text(
                          DateFormat('MMMM')
                              .format(DateTime(_selectedYear, _selectedMonth)),
                          style: GoogleFonts.inter(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    final year = await _showYearPicker();
                    if (year != null) {
                      setState(() {
                        _selectedYear = year;
                      });
                      await provider.loadMonthlyAttendanceReport(
                          month: _selectedMonth, year: _selectedYear);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.calendar_today,
                            size: 16, color: Color(0xFF64748B)),
                        const SizedBox(width: 8),
                        Text('$_selectedYear',
                            style: GoogleFonts.inter(fontSize: 14)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Summary Cards
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Working Days',
                  _formatNumber(report['working_days']),
                  Icons.work,
                  const Color(0xFF2563EB),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Present',
                  _formatNumber(report['present_days']),
                  Icons.check_circle,
                  const Color(0xFF10B981),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Absent',
                  _formatNumber(report['absent_days']),
                  Icons.cancel,
                  const Color(0xFFEF4444),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Late',
                  _formatNumber(report['late_days']),
                  Icons.access_time,
                  const Color(0xFFF59E0B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Attendance Rate
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Attendance Rate',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: LinearProgressIndicator(
                        value: attendanceRate.clamp(0.0, 1.0),
                        backgroundColor: const Color(0xFFE2E8F0),
                        color: const Color(0xFF10B981),
                        minHeight: 12,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${(attendanceRate * 100).toStringAsFixed(1)}%',
                      style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF10B981)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveTab(ReportProvider provider) {
    final report = provider.leaveReport;
    final balanceReport = provider.leaveBalanceReport;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Month/Year Selector
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    final month = await _showMonthPicker();
                    if (month != null) {
                      setState(() {
                        _selectedMonth = month;
                      });
                      await provider.loadLeaveReport(
                          month: _selectedMonth, year: _selectedYear);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.calendar_month,
                            size: 16, color: Color(0xFF64748B)),
                        const SizedBox(width: 8),
                        Text(
                          DateFormat('MMMM')
                              .format(DateTime(_selectedYear, _selectedMonth)),
                          style: GoogleFonts.inter(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    final year = await _showYearPicker();
                    if (year != null) {
                      setState(() {
                        _selectedYear = year;
                      });
                      await provider.loadLeaveReport(
                          month: _selectedMonth, year: _selectedYear);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.calendar_today,
                            size: 16, color: Color(0xFF64748B)),
                        const SizedBox(width: 8),
                        Text('$_selectedYear',
                            style: GoogleFonts.inter(fontSize: 14)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Summary Cards
          if (report != null)
            Column(
              children: [
                Row(
                  children: [
                    Expanded(
                        child: _buildSummaryCard(
                            'Total Requests',
                            _formatNumber(report['total_requests']),
                            Icons.assignment,
                            const Color(0xFF2563EB))),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _buildSummaryCard(
                            'Approved',
                            _formatNumber(report['approved']),
                            Icons.check_circle,
                            const Color(0xFF10B981))),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                        child: _buildSummaryCard(
                            'Pending',
                            _formatNumber(report['pending']),
                            Icons.pending,
                            const Color(0xFFF59E0B))),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _buildSummaryCard(
                            'Rejected',
                            _formatNumber(report['rejected']),
                            Icons.cancel,
                            const Color(0xFFEF4444))),
                  ],
                ),
              ],
            ),
          const SizedBox(height: 20),

          // Leave Balance Report
          if (balanceReport != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Leave Balance Summary',
                      style: GoogleFonts.inter(
                          fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  ...(balanceReport['balances'] as List? ?? [])
                      .map<Widget>((balance) {
                    final totalDays = _parseNumber(balance['total_days']);
                    final usedDays = _parseNumber(balance['used_days']);
                    final progressValue =
                        totalDays > 0 ? usedDays / totalDays : 0.0;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(balance['leave_type'] ?? '-',
                                  style: GoogleFonts.inter(
                                      fontWeight: FontWeight.w500)),
                              Text(
                                  '${_formatNumber(balance['remaining_days'])} days',
                                  style: GoogleFonts.inter(
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFF2563EB))),
                            ],
                          ),
                          const SizedBox(height: 4),
                          LinearProgressIndicator(
                            value: progressValue.clamp(0.0, 1.0),
                            backgroundColor: const Color(0xFFE2E8F0),
                            color: _getLeaveColor(balance['leave_code']),
                            minHeight: 6,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                  'Used: ${_formatNumber(balance['used_days'])}',
                                  style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: const Color(0xFF64748B))),
                              Text(
                                  'Total: ${_formatNumber(balance['total_days'])}',
                                  style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: const Color(0xFF64748B))),
                            ],
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(
      String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: GoogleFonts.inter(
                        fontSize: 20, fontWeight: FontWeight.bold)),
                Text(title,
                    style: GoogleFonts.inter(
                        fontSize: 11, color: const Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Helper method to safely format numbers
  String _formatNumber(dynamic value) {
    if (value == null) return '0';
    if (value is int) return value.toString();
    if (value is double) {
      if (value == value.toInt()) {
        return value.toInt().toString();
      }
      return value.toStringAsFixed(1);
    }
    if (value is String) {
      final parsed = double.tryParse(value);
      if (parsed != null) {
        if (parsed == parsed.toInt()) {
          return parsed.toInt().toString();
        }
        return parsed.toStringAsFixed(1);
      }
      return value;
    }
    return value.toString();
  }

  // Helper method to safely parse numbers
  double _parseNumber(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      return double.tryParse(value) ?? 0.0;
    }
    return 0.0;
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'present':
        return const Color(0xFF10B981);
      case 'absent':
        return const Color(0xFFEF4444);
      case 'late':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  Color _getLeaveColor(String? code) {
    switch (code?.toUpperCase()) {
      case 'AL':
        return const Color(0xFF2563EB);
      case 'SL':
        return const Color(0xFF10B981);
      case 'SPL':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF8B5CF6);
    }
  }

  Future<int?> _showMonthPicker() async {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];

    return showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Select Month'),
        content: SizedBox(
          width: 300,
          child: GridView.builder(
            shrinkWrap: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              childAspectRatio: 2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: 12,
            itemBuilder: (context, index) {
              final monthNumber = index + 1;
              return GestureDetector(
                onTap: () => Navigator.pop(context, monthNumber),
                child: Container(
                  decoration: BoxDecoration(
                    color: _selectedMonth == monthNumber
                        ? const Color(0xFF2563EB)
                        : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      months[index],
                      style: GoogleFonts.inter(
                        color: _selectedMonth == monthNumber
                            ? Colors.white
                            : const Color(0xFF1E293B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Future<int?> _showYearPicker() async {
    final currentYear = DateTime.now().year;
    final years = [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ];

    return showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Select Year'),
        content: SizedBox(
          width: 200,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: years.map((year) {
              return ListTile(
                title: Center(child: Text(year.toString())),
                selected: _selectedYear == year,
                selectedTileColor: const Color(0xFF2563EB).withOpacity(0.1),
                onTap: () => Navigator.pop(context, year),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

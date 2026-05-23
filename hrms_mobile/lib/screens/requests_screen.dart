// lib/screens/requests_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/leave_provider.dart';
import '../widgets/loading_widget.dart';
import '../utils/helpers.dart';

class RequestsScreen extends StatefulWidget {
  @override
  _RequestsScreenState createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
    await Future.wait([
      leaveProvider.loadPendingLeaves(),
      leaveProvider.loadPendingReplacements(),
    ]);
  }

  Future<void> _showRejectDialog(int id, String type) async {
    final reasonController = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Reject Request'),
        content: TextField(
          controller: reasonController,
          decoration: InputDecoration(
            labelText: 'Rejection Reason',
            hintText: 'Please provide a reason...',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final leaveProvider =
                  Provider.of<LeaveProvider>(context, listen: false);
              bool success = type == 'leave'
                  ? await leaveProvider.rejectLeave(id, reasonController.text)
                  : await leaveProvider.rejectReplacement(
                      id, reasonController.text);

              if (success) {
                await _loadData();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                      content: Text('Request rejected'),
                      backgroundColor: Colors.orange),
                );
              }
              Navigator.pop(context);
            },
            child: Text('Reject', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Future<void> _showApproveDialog(
      int id, String type, String employeeName) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Approve Request'),
        content: Text(
            'Are you sure you want to approve this request from $employeeName?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final leaveProvider =
                  Provider.of<LeaveProvider>(context, listen: false);
              bool success = type == 'leave'
                  ? await leaveProvider.approveLeave(id)
                  : await leaveProvider.approveReplacement(id);

              if (success) {
                await _loadData();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                      content: Text('Request approved!'),
                      backgroundColor: Colors.green),
                );
              }
              Navigator.pop(context);
            },
            child: Text('Approve', style: TextStyle(color: Colors.green)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Pending Requests'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.blue,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Leave Requests'),
            Tab(text: 'Replacement Requests'),
          ],
          labelColor: Colors.blue,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.blue,
        ),
      ),
      body: Consumer<LeaveProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return LoadingWidget();
          }

          return TabBarView(
            controller: _tabController,
            children: [
              _buildLeaveRequests(provider),
              _buildReplacementRequests(provider),
            ],
          );
        },
      ),
    );
  }

  Widget _buildLeaveRequests(LeaveProvider provider) {
    final requests = provider.pendingLeaves;

    if (requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, size: 64, color: Colors.green),
            SizedBox(height: 16),
            Text(
              'No pending leave requests',
              style: TextStyle(color: Colors.grey, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadPendingLeaves(),
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: requests.length,
        itemBuilder: (context, index) {
          final request = requests[index];

          return Card(
            elevation: 3,
            margin: EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.blue.shade100,
                              child: Text(
                                request['employee']['first_name'][0],
                                style: TextStyle(
                                    color: Colors.blue,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${request['employee']['first_name']} ${request['employee']['last_name']}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  Text(
                                    request['employee']['employee_id'],
                                    style: TextStyle(
                                        fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding:
                            EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade100,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.pending, size: 14, color: Colors.orange),
                            SizedBox(width: 4),
                            Text(
                              'PENDING',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 16),
                  Divider(),
                  SizedBox(height: 12),

                  // Leave Details
                  _buildDetailRow(Icons.category, 'Leave Type',
                      request['leave_type']['name']),
                  SizedBox(height: 8),
                  _buildDetailRow(Icons.date_range, 'Period',
                      '${request['start_date']} - ${request['end_date']}'),
                  SizedBox(height: 8),
                  _buildDetailRow(Icons.numbers, 'Total Days',
                      '${request['total_days']} day(s)'),
                  SizedBox(height: 8),
                  _buildDetailRow(
                      Icons.description, 'Reason', request['reason']),

                  SizedBox(height: 16),
                  Divider(),
                  SizedBox(height: 16),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _showApproveDialog(
                              request['id'],
                              'leave',
                              '${request['employee']['first_name']} ${request['employee']['last_name']}'),
                          icon: Icon(Icons.check_circle, size: 18),
                          label: Text('Approve'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _showRejectDialog(request['id'], 'leave'),
                          icon: Icon(Icons.cancel, size: 18),
                          label: Text('Reject'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
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
    );
  }

  Widget _buildReplacementRequests(LeaveProvider provider) {
    final requests = provider.pendingReplacements;

    if (requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, size: 64, color: Colors.green),
            SizedBox(height: 16),
            Text(
              'No pending replacement requests',
              style: TextStyle(color: Colors.grey, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadPendingReplacements(),
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: requests.length,
        itemBuilder: (context, index) {
          final request = requests[index];

          return Card(
            elevation: 3,
            margin: EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.orange.shade100,
                              child: Text(
                                request['employee']['first_name'][0],
                                style: TextStyle(
                                    color: Colors.orange,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${request['employee']['first_name']} ${request['employee']['last_name']}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  Text(
                                    request['employee']['employee_id'],
                                    style: TextStyle(
                                        fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding:
                            EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade100,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.pending, size: 14, color: Colors.orange),
                            SizedBox(width: 4),
                            Text(
                              'PENDING',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 16),
                  Divider(),
                  SizedBox(height: 12),

                  // Replacement Details
                  _buildDetailRow(
                      Icons.work, 'Work Date', request['work_date']),
                  SizedBox(height: 8),
                  _buildDetailRow(
                      Icons.event,
                      'Day Type',
                      request['work_day_type'] == 'weekend'
                          ? 'Weekend'
                          : 'Public Holiday'),
                  SizedBox(height: 8),
                  _buildDetailRow(Icons.access_time, 'Hours Worked',
                      '${request['hours_worked']} hours'),
                  SizedBox(height: 8),
                  _buildDetailRow(Icons.arrow_forward, 'Days to Add',
                      '+${request['days_to_add']} day(s)'),
                  SizedBox(height: 8),
                  _buildDetailRow(Icons.calendar_today, 'Replacement Date',
                      request['replacement_date']),
                  if (request['reason'] != null &&
                      request['reason'].isNotEmpty) ...[
                    SizedBox(height: 8),
                    _buildDetailRow(
                        Icons.description, 'Reason', request['reason']),
                  ],

                  SizedBox(height: 16),
                  Divider(),
                  SizedBox(height: 16),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _showApproveDialog(
                              request['id'],
                              'replacement',
                              '${request['employee']['first_name']} ${request['employee']['last_name']}'),
                          icon: Icon(Icons.check_circle, size: 18),
                          label: Text('Approve'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _showRejectDialog(request['id'], 'replacement'),
                          icon: Icon(Icons.cancel, size: 18),
                          label: Text('Reject'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
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
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        SizedBox(width: 12),
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}

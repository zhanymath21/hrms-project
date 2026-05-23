// lib/screens/replacement_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/leave_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/loading_widget.dart';
import '../utils/helpers.dart';

class ReplacementScreen extends StatefulWidget {
  @override
  _ReplacementScreenState createState() => _ReplacementScreenState();
}

class _ReplacementScreenState extends State<ReplacementScreen> {
  bool _showRequestForm = false;

  final _formKey = GlobalKey<FormState>();
  DateTime? _workDate;
  String? _workDayType = 'weekend';
  int _hoursWorked = 8;
  DateTime? _replacementDate;
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<LeaveProvider>(context, listen: false);
    await provider.loadReplacementLeaves();
  }

  Future<void> _submitRequest() async {
    if (_formKey.currentState!.validate()) {
      final provider = Provider.of<LeaveProvider>(context, listen: false);

      bool success = await provider.createReplacementLeave(
        workDate: DateFormat('yyyy-MM-dd').format(_workDate!),
        workDayType: _workDayType!,
        hoursWorked: _hoursWorked,
        replacementDate: DateFormat('yyyy-MM-dd').format(_replacementDate!),
        reason:
            _reasonController.text.isNotEmpty ? _reasonController.text : null,
      );

      if (success) {
        setState(() {
          _showRequestForm = false;
          _workDate = null;
          _replacementDate = null;
          _reasonController.clear();
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Replacement request submitted!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.error ?? 'Failed to submit'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _cancelReplacement(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Cancel Replacement Request'),
        content: Text(
          'Are you sure you want to cancel this replacement request?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Yes'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final provider = Provider.of<LeaveProvider>(context, listen: false);
      bool success = await provider.cancelReplacement(id);

      await _loadData();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Replacement cancelled' : 'Failed to cancel'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  double getDaysToAdd() {
    return _hoursWorked >= 8 ? 1.0 : 0.5;
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return Helpers.formatDate(date);
    } catch (e) {
      return dateStr;
    }
  }

  String _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return '-';
    try {
      final date = DateTime.parse(dateTimeStr);
      return Helpers.formatDateTime(date);
    } catch (e) {
      return dateTimeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Replacement Leave'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.blue,
        elevation: 0,
        actions: [
          if (!_showRequestForm)
            IconButton(
              icon: Icon(Icons.add),
              onPressed: () => setState(() => _showRequestForm = true),
            ),
        ],
      ),
      body: Consumer<LeaveProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.replacementLeaves.isEmpty) {
            return LoadingWidget();
          }

          if (_showRequestForm) {
            return _buildRequestForm(provider, user);
          }

          return _buildRequestsList(provider, user);
        },
      ),
    );
  }

  Widget _buildRequestsList(
      LeaveProvider provider, Map<String, dynamic>? user) {
    final requests = provider.replacementLeaves;
    final isManager = user != null &&
        (user['position']?['title']?.contains('Manager') == true ||
            user['position']?['title']?.contains('HR') == true ||
            user['position']?['title']?.contains('Admin') == true);

    if (requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.holiday_village, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No replacement requests',
              style: TextStyle(color: Colors.grey),
            ),
            SizedBox(height: 8),
            TextButton.icon(
              onPressed: () => setState(() => _showRequestForm = true),
              icon: Icon(Icons.add),
              label: Text('Request Replacement'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadReplacementLeaves(refresh: true),
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: requests.length,
        itemBuilder: (context, index) {
          final request = requests[index];
          final statusColor = request['status'] == 'approved'
              ? Colors.green
              : request['status'] == 'rejected'
                  ? Colors.red
                  : Colors.orange;

          // Check if user is the owner of this request
          final isOwner = user != null && request['employee_id'] == user['id'];
          final canCancel = isOwner && request['status'] == 'pending';
          final showEmployeeInfo = isManager || !isOwner;

          return Card(
            elevation: 2,
            margin: EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Employee Info (for Manager)
                  if (showEmployeeInfo && request['employee'] != null)
                    Container(
                      margin: EdgeInsets.only(bottom: 12),
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.blue.shade100,
                            child: Text(
                              '${request['employee']['first_name']?[0]}${request['employee']['last_name']?[0]}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
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
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  request['employee']['employee_id'] ?? '',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (request['employee']['department'] != null)
                            Container(
                              padding: EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                request['employee']['department']['name'] ?? '',
                                style: TextStyle(fontSize: 10),
                              ),
                            ),
                        ],
                      ),
                    ),

                  // Request Info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Worked on ${_formatDate(request['work_date'])}',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          request['status'].toUpperCase(),
                          style: TextStyle(
                            fontSize: 12,
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),

                  // Details Grid
                  GridView.count(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                    childAspectRatio: 3,
                    children: [
                      _buildDetailItem(
                        Icons.access_time,
                        'Hours',
                        '${request['hours_worked']} hours',
                      ),
                      _buildDetailItem(
                        Icons.arrow_forward,
                        'Days to Add',
                        '+${request['days_to_add']}',
                        valueColor: Colors.green,
                      ),
                      _buildDetailItem(
                        Icons.calendar_today,
                        'Replacement Date',
                        _formatDate(request['replacement_date']),
                      ),
                      _buildDetailItem(
                        Icons.event,
                        'Day Type',
                        request['work_day_type'] == 'weekend'
                            ? 'Weekend'
                            : 'Public Holiday',
                      ),
                    ],
                  ),

                  if (request['reason'] != null && request['reason'].isNotEmpty)
                    Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Reason: ${request['reason']}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ),

                  // Submitted date
                  Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Submitted: ${_formatDateTime(request['created_at'])}',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ),

                  // Cancel button for pending requests
                  if (canCancel)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () => _cancelReplacement(request['id']),
                        icon: Icon(Icons.cancel, size: 18),
                        label: Text('Cancel Request'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                      ),
                    ),

                  // Rejection reason
                  if (request['status'] == 'rejected' &&
                      request['rejection_reason'] != null)
                    Container(
                      margin: EdgeInsets.only(top: 8),
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Rejected: ${request['rejection_reason']}',
                        style: TextStyle(fontSize: 12, color: Colors.red),
                      ),
                    ),

                  // Approval info
                  if (request['status'] == 'approved' &&
                      request['approved_by'] != null)
                    Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Approved by: ${request['approved_by']} on ${_formatDateTime(request['approved_at'])}',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
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

  Widget _buildDetailItem(IconData icon, String label, String value,
      {Color? valueColor}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade600),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: valueColor,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRequestForm(LeaveProvider provider, Map<String, dynamic>? user) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                IconButton(
                  icon: Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _showRequestForm = false),
                ),
                SizedBox(width: 8),
                Text(
                  'Request Replacement Leave',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 16),

            // Employee Info Card
            if (user != null)
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.blue.shade100,
                      child: Text(
                        '${user['first_name']?[0]}${user['last_name']?[0]}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${user['first_name']} ${user['last_name']}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            user['employee_id'] ?? '',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            SizedBox(height: 16),

            // Info Card
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '📋 Replacement Leave Policy',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '• Working on weekend or public holiday',
                    style: TextStyle(fontSize: 12),
                  ),
                  Text(
                    '• 4-7 hours = 0.5 day replacement',
                    style: TextStyle(fontSize: 12),
                  ),
                  Text(
                    '• 8+ hours = 1 full day replacement',
                    style: TextStyle(fontSize: 12),
                  ),
                  Text(
                    '• Replacement day must be on weekday',
                    style: TextStyle(fontSize: 12),
                  ),
                  Text(
                    '• Request must be submitted within 30 days',
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24),

            // Work Date
            ListTile(
              title: Text('Work Date *'),
              subtitle: _workDate != null
                  ? Text(Helpers.formatDate(_workDate!))
                  : Text('Select the date you worked'),
              trailing: Icon(Icons.calendar_today),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now().subtract(Duration(days: 7)),
                  firstDate: DateTime.now().subtract(Duration(days: 30)),
                  lastDate: DateTime.now(),
                );
                if (date != null) setState(() => _workDate = date);
              },
            ),

            // Day Type
            SizedBox(height: 8),
            Text('Day Type *', style: TextStyle(fontWeight: FontWeight.w500)),
            SizedBox(height: 8),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(
                  value: 'weekend',
                  label: Text('Weekend'),
                  icon: Icon(Icons.weekend),
                ),
                ButtonSegment(
                  value: 'public_holiday',
                  label: Text('Public Holiday'),
                  icon: Icon(Icons.celebration),
                ),
              ],
              selected: {_workDayType!},
              onSelectionChanged: (set) =>
                  setState(() => _workDayType = set.first),
            ),
            SizedBox(height: 16),

            // Hours Worked
            Text('Hours Worked *',
                style: TextStyle(fontWeight: FontWeight.w500)),
            SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Slider(
                    value: _hoursWorked.toDouble(),
                    min: 1,
                    max: 12,
                    divisions: 11,
                    label: '$_hoursWorked hours',
                    onChanged: (value) =>
                        setState(() => _hoursWorked = value.round()),
                  ),
                ),
                Container(
                  width: 60,
                  padding: EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$_hoursWorked h',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),

            // Days to add preview
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info, color: Colors.green),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'You will receive: ${getDaysToAdd()} day(s) added to your Annual Leave balance',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: Colors.green,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16),

            // Replacement Date
            ListTile(
              title: Text('Preferred Replacement Date *'),
              subtitle: _replacementDate != null
                  ? Text(Helpers.formatDate(_replacementDate!))
                  : Text('Select your preferred replacement date'),
              trailing: Icon(Icons.calendar_today),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now().add(Duration(days: 7)),
                  firstDate: DateTime.now().add(Duration(days: 1)),
                  lastDate: DateTime.now().add(Duration(days: 90)),
                );
                if (date != null) setState(() => _replacementDate = date);
              },
            ),
            SizedBox(height: 16),

            // Reason
            TextFormField(
              controller: _reasonController,
              decoration: InputDecoration(
                labelText: 'Reason (Optional)',
                hintText: 'Explain why you worked on this day...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              maxLines: 3,
            ),
            SizedBox(height: 24),

            // Submit Button
            ElevatedButton(
              onPressed: provider.isLoading ? null : _submitRequest,
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.symmetric(vertical: 14),
                backgroundColor: Colors.orange,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: provider.isLoading
                  ? SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text('Submit Request', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}

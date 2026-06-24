<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeSalarySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EmployeeSalarySettingController extends Controller
{
    /**
     * Get all salary settings
     */
    public function index(Request $request)
    {
        try {
            $query = EmployeeSalarySetting::with('employee');

            if ($request->has('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            $settings = $query->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $settings,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching salary settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch salary settings',
            ], 500);
        }
    }

    /**
     * Get salary setting for specific employee
     */
    public function show($employeeId)
    {
        try {
            $setting = EmployeeSalarySetting::with('employee')
                ->where('employee_id', $employeeId)
                ->first();

            if (!$setting) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Salary setting not found for this employee',
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $setting,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching salary setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch salary setting',
            ], 500);
        }
    }

    /**
     * Create or update salary setting
     */
    // app/Http/Controllers/Api/EmployeeSalarySettingController.php

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'basic_salary' => 'required|numeric|min:0',
                'housing_allowance' => 'nullable|numeric|min:0',
                'transport_allowance' => 'nullable|numeric|min:0',
                'meal_allowance' => 'nullable|numeric|min:0',
                'phone_allowance' => 'nullable|numeric|min:0',
                'other_allowance' => 'nullable|numeric|min:0',
                'dependents' => 'nullable|integer|min:0',
                'is_tax_exempt' => 'nullable|boolean',
                'payment_method' => 'nullable|in:bank_transfer,cash,check',
                'bank_name' => 'nullable|string|max:255',
                'bank_account_number' => 'nullable|string|max:255',
                'bank_account_name' => 'nullable|string|max:255',
                'currency' => 'nullable|string|in:USD,KHR',
                'working_days_per_month' => 'nullable|integer|min:1|max:31',
                'working_days_type' => 'nullable|string|in:standard,shift,flexible',
                'include_weekends' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // ✅ Check if setting already exists
            $existing = EmployeeSalarySetting::where('employee_id', $request->employee_id)->first();

            if ($existing) {
                // ✅ Update existing
                $existing->update($request->all());
                $setting = $existing;
                $message = 'Salary setting updated successfully';
            } else {
                // ✅ Create new
                $setting = EmployeeSalarySetting::create($request->all());
                $message = 'Salary setting created successfully';
            }

            return response()->json([
                'status' => 'success',
                'message' => $message,
                'data' => $setting->load('employee'),
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving salary setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save salary setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $employeeId)
    {
        try {
            $setting = EmployeeSalarySetting::where('employee_id', $employeeId)->first();

            if (!$setting) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Salary setting not found for this employee',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'basic_salary' => 'sometimes|numeric|min:0',
                'housing_allowance' => 'nullable|numeric|min:0',
                'transport_allowance' => 'nullable|numeric|min:0',
                'meal_allowance' => 'nullable|numeric|min:0',
                'phone_allowance' => 'nullable|numeric|min:0',
                'other_allowance' => 'nullable|numeric|min:0',
                'dependents' => 'nullable|integer|min:0',
                'is_tax_exempt' => 'nullable|boolean',
                'payment_method' => 'nullable|in:bank_transfer,cash,check',
                'bank_name' => 'nullable|string|max:255',
                'bank_account_number' => 'nullable|string|max:255',
                'bank_account_name' => 'nullable|string|max:255',
                'currency' => 'nullable|string|in:KHR,USD',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // ✅ Set default values for nullable fields
            $data = $request->all();
            $data['housing_allowance'] = $data['housing_allowance'] ?? 0;
            $data['transport_allowance'] = $data['transport_allowance'] ?? 0;
            $data['meal_allowance'] = $data['meal_allowance'] ?? 0;
            $data['phone_allowance'] = $data['phone_allowance'] ?? 0;
            $data['other_allowance'] = $data['other_allowance'] ?? 0;
            $data['dependents'] = $data['dependents'] ?? 0;
            $data['is_tax_exempt'] = $data['is_tax_exempt'] ?? false;
            $data['payment_method'] = $data['payment_method'] ?? 'bank_transfer';
            $data['currency'] = $data['currency'] ?? 'KHR';

            $setting->update($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Salary setting updated successfully',
                'data' => $setting->load('employee'),
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating salary setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update salary setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete salary setting
     */
    public function destroy($employeeId)
    {
        try {
            $setting = EmployeeSalarySetting::where('employee_id', $employeeId)->first();

            if (!$setting) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Salary setting not found for this employee',
                ], 404);
            }

            $setting->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Salary setting deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting salary setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete salary setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get salary breakdown for an employee
     */
    public function breakdown($employeeId)
    {
        try {
            $setting = EmployeeSalarySetting::where('employee_id', $employeeId)->first();

            if (!$setting) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Salary setting not found for this employee',
                ], 404);
            }

            $breakdown = [
                'employee_id' => $setting->employee_id,
                'employee_name' => $setting->employee->first_name . ' ' . $setting->employee->last_name,
                'basic_salary' => $setting->basic_salary,
                'allowances' => [
                    'housing' => $setting->housing_allowance,
                    'transport' => $setting->transport_allowance,
                    'meal' => $setting->meal_allowance,
                    'phone' => $setting->phone_allowance,
                    'other' => $setting->other_allowance,
                    'total_allowance' => $setting->total_allowance,
                ],
                'total_salary' => $setting->total_salary,
                'tax_exempt' => $setting->is_tax_exempt,
                'dependents' => $setting->dependents,
                'currency' => $setting->currency,
            ];

            return response()->json([
                'status' => 'success',
                'data' => $breakdown,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting salary breakdown: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get salary breakdown',
            ], 500);
        }
    }
}

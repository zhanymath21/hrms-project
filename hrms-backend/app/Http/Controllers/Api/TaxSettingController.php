<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaxSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class TaxSettingController extends Controller
{
    /**
     * Get all tax settings
     */
    public function index(Request $request)
    {
        try {
            $query = TaxSetting::query();

            if ($request->has('year')) {
                $query->where('year', $request->year);
            }
            if ($request->has('is_active')) {
                $query->where('is_active', $request->is_active);
            }

            $settings = $query->orderBy('year', 'desc')->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $settings,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching tax settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch tax settings',
            ], 500);
        }
    }

    /**
     * Get active tax settings
     */
    public function active()
    {
        try {
            $setting = TaxSetting::getActive();

            if (!$setting) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No active tax settings found',
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $setting,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching active tax settings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch active tax settings',
            ], 500);
        }
    }

    /**
     * Get tax calculation for a salary
     */
    public function calculate(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'salary' => 'required|numeric|min:0',
                'dependents' => 'nullable|integer|min:0',
                'year' => 'nullable|integer|min:2000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $year = $request->year ?? date('Y');
            $taxSetting = TaxSetting::where('year', $year)->where('is_active', true)->first();

            if (!$taxSetting) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No tax settings found for year ' . $year,
                ], 404);
            }

            $salary = $request->salary;
            $dependents = $request->dependents ?? 0;

            $summary = $taxSetting->getTaxSummary($salary, $dependents);
            $taxBrackets = $taxSetting->getTaxBracketsFormatted();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'summary' => $summary,
                    'tax_brackets' => $taxBrackets,
                    'settings' => [
                        'year' => $taxSetting->year,
                        'personal_relief' => $taxSetting->personal_relief,
                        'dependent_relief' => $taxSetting->dependent_relief,
                        'nssf_employee_rate' => $taxSetting->nssf_employee_rate,
                        'nssf_employer_rate' => $taxSetting->nssf_employer_rate,
                        'minimum_wage' => $taxSetting->minimum_wage,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error calculating tax: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to calculate tax: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create tax setting
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'year' => 'required|integer|min:2000|unique:tax_settings,year',
                'tax_brackets' => 'required|array',
                'tax_brackets.*.threshold' => 'nullable|numeric|min:0',
                'tax_brackets.*.rate' => 'required|numeric|min:0|max:100',
                'tax_brackets.*.description' => 'nullable|string',
                'personal_relief' => 'nullable|numeric|min:0',
                'dependent_relief' => 'nullable|numeric|min:0',
                'nssf_employee_rate' => 'nullable|numeric|min:0|max:100',
                'nssf_employer_rate' => 'nullable|numeric|min:0|max:100',
                'social_security_brackets' => 'nullable|array',
                'minimum_wage' => 'nullable|numeric|min:0',
                'is_active' => 'nullable|boolean',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // If this is active, deactivate others
            if ($request->is_active) {
                TaxSetting::where('is_active', true)->update(['is_active' => false]);
            }

            $data = $request->all();
            $data['is_active'] = $data['is_active'] ?? false;

            $taxSetting = TaxSetting::create($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Tax setting created successfully',
                'data' => $taxSetting,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating tax setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create tax setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update tax setting
     */
    public function update(Request $request, $id)
    {
        try {
            $taxSetting = TaxSetting::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'year' => 'sometimes|integer|min:2000|unique:tax_settings,year,' . $id,
                'tax_brackets' => 'sometimes|array',
                'tax_brackets.*.threshold' => 'nullable|numeric|min:0',
                'tax_brackets.*.rate' => 'required|numeric|min:0|max:100',
                'tax_brackets.*.description' => 'nullable|string',
                'personal_relief' => 'nullable|numeric|min:0',
                'dependent_relief' => 'nullable|numeric|min:0',
                'nssf_employee_rate' => 'nullable|numeric|min:0|max:100',
                'nssf_employer_rate' => 'nullable|numeric|min:0|max:100',
                'social_security_brackets' => 'nullable|array',
                'minimum_wage' => 'nullable|numeric|min:0',
                'is_active' => 'nullable|boolean',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // If this is active, deactivate others
            if ($request->is_active) {
                TaxSetting::where('id', '!=', $id)->where('is_active', true)->update(['is_active' => false]);
            }

            $taxSetting->update($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Tax setting updated successfully',
                'data' => $taxSetting,
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating tax setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update tax setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete tax setting
     */
    public function destroy($id)
    {
        try {
            $taxSetting = TaxSetting::findOrFail($id);
            $taxSetting->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Tax setting deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting tax setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete tax setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Activate tax setting
     */
    public function activate($id)
    {
        try {
            $taxSetting = TaxSetting::findOrFail($id);

            // Deactivate all others
            TaxSetting::where('is_active', true)->update(['is_active' => false]);

            // Activate this one
            $taxSetting->is_active = true;
            $taxSetting->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Tax setting activated successfully',
                'data' => $taxSetting,
            ]);
        } catch (\Exception $e) {
            Log::error('Error activating tax setting: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to activate tax setting: ' . $e->getMessage(),
            ], 500);
        }
    }
}

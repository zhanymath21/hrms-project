<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Login - Web hanya untuk Admin/HR/Manager, Mobile untuk semua
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
            'device_type' => 'nullable|in:web,mobile',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $employee = Employee::where('email', $request->email)->first();

        if (!$employee || !Hash::check($request->password, $employee->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials',
            ], 401);
        }

        if ($employee->status !== 'active') {
            return response()->json([
                'status' => 'error',
                'message' => 'Your account is not active. Please contact HR.',
            ], 403);
        }

        // Check device type
        $deviceType = $request->device_type ?? 'web';

        // Admin/HR positions yang boleh login dari web
        $webAllowedTitles = [
            'HR Manager',
            'HR Officer',
            'HR Assistant',
            'Admin',
            'System Admin',
            'IT Manager',
            'Finance Manager',
            'Marketing Manager',
            'Sales Manager',
            'Operations Manager',
            'Manager',
        ];

        $employeeTitle = $employee->position->title ?? '';
        $isWebAllowed = in_array($employeeTitle, $webAllowedTitles);

        // Jika login dari web, hanya Admin/HR/Manager yang boleh
        if ($deviceType === 'web' && !$isWebAllowed) {
            return response()->json([
                'status' => 'error',
                'message' => 'Web login is only available for Admin, HR, and Manager. Please use the mobile app.',
                'code' => 'WEB_LOGIN_NOT_ALLOWED',
            ], 403);
        }

        // Create token
        $tokenName = $deviceType === 'mobile' ? 'mobile-token' : 'web-token';
        $token = $employee->createToken($tokenName)->plainTextToken;

        $employee->load(['department', 'position']);

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful',
            'data' => [
                'employee' => $employee,
                'token' => $token,
                'device_type' => $deviceType,
            ],
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get profile
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user()->load(['department', 'position', 'manager']);

        return response()->json([
            'status' => 'success',
            'data' => $user,
        ]);
    }
}

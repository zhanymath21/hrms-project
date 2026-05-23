<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmployeeCardController extends Controller
{
    /**
     * Get all cards
     */
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeCard::with('employee');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->active();
            } elseif ($request->status === 'expired') {
                $query->expired();
            }
        }

        $cards = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $cards,
        ]);
    }

    /**
     * Get card by card number
     */
    public function show(string $cardNumber): JsonResponse
    {
        $card = EmployeeCard::with('employee')
            ->where('card_number', $cardNumber)
            ->first();

        if (!$card) {
            return response()->json([
                'status' => 'error',
                'message' => 'Card not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'card' => $card,
                'employee' => $card->employee?->only([
                    'id',
                    'employee_id',
                    'first_name',
                    'last_name',
                    'department_id',
                    'position_id',
                    'status',
                ]),
                'is_valid' => $card->isValid(),
            ],
        ]);
    }

    /**
     * Assign card to employee
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'card_number' => 'required|string|unique:employee_cards,card_number',
            'card_type' => 'required|in:RFID,NFC,Barcode,QR,Magnetic',
            'issued_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:issued_date',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if employee exists
        $employee = Employee::find($request->employee_id);
        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Employee not found',
            ], 404);
        }

        // Deactivate existing cards
        EmployeeCard::where('employee_id', $request->employee_id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Create new card
        $card = EmployeeCard::create([
            'employee_id' => $request->employee_id,
            'card_number' => $request->card_number,
            'card_type' => $request->card_type,
            'is_active' => true,
            'issued_date' => $request->issued_date ?? now(),
            'expiry_date' => $request->expiry_date,
            'notes' => $request->notes,
        ]);

        // Update employee card info
        $employee->update([
            'card_number' => $request->card_number,
            'card_type' => $request->card_type,
            'use_card' => true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Card assigned successfully',
            'data' => $card->load('employee'),
        ], 201);
    }

    /**
     * Update card
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $card = EmployeeCard::find($id);

        if (!$card) {
            return response()->json([
                'status' => 'error',
                'message' => 'Card not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'card_type' => 'sometimes|in:RFID,NFC,Barcode,QR,Magnetic',
            'is_active' => 'sometimes|boolean',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $card->update($request->only([
            'card_type',
            'is_active',
            'expiry_date',
            'notes',
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Card updated successfully',
            'data' => $card->fresh(),
        ]);
    }

    /**
     * Deactivate card
     */
    public function destroy(int $id): JsonResponse
    {
        $card = EmployeeCard::find($id);

        if (!$card) {
            return response()->json([
                'status' => 'error',
                'message' => 'Card not found',
            ], 404);
        }

        $card->update(['is_active' => false]);
        $card->delete();

        // Update employee
        if ($card->employee) {
            $card->employee->update([
                'use_card' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Card deactivated successfully',
        ]);
    }

    /**
     * Validate card for attendance
     */
    public function validateCard(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'card_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $card = EmployeeCard::with('employee.department', 'employee.position')
            ->where('card_number', $request->card_number)
            ->first();

        if (!$card) {
            return response()->json([
                'status' => 'error',
                'message' => 'Card not registered',
            ], 404);
        }

        if (!$card->isValid()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Card is expired or inactive',
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Card is valid',
            'data' => [
                'employee_name' => $card->employee->first_name . ' ' . $card->employee->last_name,
                'employee_id' => $card->employee->employee_id,
                'department' => $card->employee->department?->name,
                'card_type' => $card->card_type,
            ],
        ]);
    }

    /**
     * Generate cards for all employees without cards
     */
    public function batchGenerate(Request $request): JsonResponse
    {
        $cardType = $request->card_type ?? 'RFID';

        $employeesWithoutCard = Employee::whereNull('card_number')
            ->where('status', 'active')
            ->get();

        $count = 0;
        foreach ($employeesWithoutCard as $employee) {
            $cardNumber = $this->generateUniqueCardNumber();
            $employee->update([
                'card_number' => $cardNumber,
                'card_type' => $cardType,
                'use_card' => true,
            ]);
            $count++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Generated cards for {$count} employees",
            'data' => [
                'total_processed' => $count,
                'card_type' => $cardType,
            ],
        ]);
    }

    /**
     * Generate unique card number
     */
    private function generateUniqueCardNumber(): string
    {
        $prefix = 'HRMS';
        $year = date('y');
        $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
        $cardNumber = "{$prefix}-{$year}-{$random}";

        while (Employee::where('card_number', $cardNumber)->exists()) {
            $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
            $cardNumber = "{$prefix}-{$year}-{$random}";
        }

        return $cardNumber;
    }
}
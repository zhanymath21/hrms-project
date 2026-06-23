<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ExchangeRateController extends Controller
{
    /**
     * Get all exchange rates
     */
    public function index(Request $request)
    {
        try {
            $query = ExchangeRate::query();

            if ($request->has('from_currency')) {
                $query->where('from_currency', $request->from_currency);
            }
            if ($request->has('to_currency')) {
                $query->where('to_currency', $request->to_currency);
            }
            if ($request->has('is_active')) {
                $query->where('is_active', $request->is_active);
            }

            $rates = $query->orderBy('effective_date', 'desc')->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $rates,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching exchange rates: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch exchange rates: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get active exchange rates
     */
    public function active()
    {
        try {
            $usdToKhr = ExchangeRate::where('from_currency', 'USD')
                ->where('to_currency', 'KHR')
                ->where('is_active', true)
                ->whereDate('effective_date', '<=', now())
                ->orderBy('effective_date', 'desc')
                ->first();

            $khrToUsd = ExchangeRate::where('from_currency', 'KHR')
                ->where('to_currency', 'USD')
                ->where('is_active', true)
                ->whereDate('effective_date', '<=', now())
                ->orderBy('effective_date', 'desc')
                ->first();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'usd_to_khr' => $usdToKhr,
                    'khr_to_usd' => $khrToUsd,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching active exchange rates: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch active exchange rates: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Convert currency
     */
    public function convert(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'amount' => 'required|numeric|min:0',
                'from' => 'required|string|size:3',
                'to' => 'required|string|size:3',
                'date' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $date = $request->date ?? now();
            $converted = ExchangeRate::convert($request->amount, $request->from, $request->to, $date);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'amount' => $request->amount,
                    'from' => $request->from,
                    'to' => $request->to,
                    'converted_amount' => $converted,
                    'date' => $date,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error converting currency: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to convert currency: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single exchange rate
     */
    public function show($id)
    {
        try {
            $rate = ExchangeRate::findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $rate,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching exchange rate: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Exchange rate not found',
            ], 404);
        }
    }

    /**
     * Create exchange rate
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_currency' => 'required|string|size:3',
                'to_currency' => 'required|string|size:3',
                'rate' => 'required|numeric|min:0',
                'effective_date' => 'required|date',
                'is_active' => 'nullable|boolean',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // If this is active, deactivate others with same currencies
            if ($request->is_active) {
                ExchangeRate::where('from_currency', $request->from_currency)
                    ->where('to_currency', $request->to_currency)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $rate = ExchangeRate::create([
                'from_currency' => $request->from_currency,
                'to_currency' => $request->to_currency,
                'rate' => $request->rate,
                'effective_date' => $request->effective_date,
                'is_active' => $request->is_active ?? false,
                'notes' => $request->notes,
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Exchange rate created successfully',
                'data' => $rate,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating exchange rate: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create exchange rate: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update exchange rate
     */
    public function update(Request $request, $id)
    {
        try {
            $rate = ExchangeRate::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'rate' => 'sometimes|numeric|min:0',
                'effective_date' => 'sometimes|date',
                'is_active' => 'nullable|boolean',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // If this is active, deactivate others with same currencies
            if ($request->is_active) {
                ExchangeRate::where('from_currency', $rate->from_currency)
                    ->where('to_currency', $rate->to_currency)
                    ->where('id', '!=', $id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $rate->update([
                'rate' => $request->rate ?? $rate->rate,
                'effective_date' => $request->effective_date ?? $rate->effective_date,
                'is_active' => $request->is_active ?? $rate->is_active,
                'notes' => $request->notes ?? $rate->notes,
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Exchange rate updated successfully',
                'data' => $rate,
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating exchange rate: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update exchange rate: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete exchange rate
     */
    public function destroy($id)
    {
        try {
            $rate = ExchangeRate::findOrFail($id);
            $rate->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Exchange rate deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting exchange rate: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete exchange rate: ' . $e->getMessage(),
            ], 500);
        }
    }
}

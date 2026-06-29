<?php

namespace App\Imports;

use App\Models\PPEItem;
use App\Models\PPECategory;
use App\Models\PPEHistory;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Carbon\Carbon;

class PPEImport implements
    ToModel,
    WithHeadingRow,
    WithValidation,
    SkipsOnError,
    WithBatchInserts,
    WithChunkReading
{
    use Importable, SkipsErrors;

    private $categories;
    private $importedBy;
    private $importedByName;
    private $successCount = 0;
    private $failCount = 0;
    private $errors = [];

    public function __construct($importedBy, $importedByName)
    {
        $this->categories = PPECategory::pluck('id', 'code')->toArray();
        $this->importedBy = $importedBy;
        $this->importedByName = $importedByName;
    }

    /**
     * Map Excel row to model
     */
    public function model(array $row): ?PPEItem
    {
        try {
            // Cari category_id dari code
            $categoryCode = strtoupper(trim($row['category_code'] ?? ''));
            $categoryId = $this->categories[$categoryCode] ?? null;

            if (!$categoryId) {
                $this->errors[] = "Category code '{$categoryCode}' not found for item '{$row['name']}'";
                $this->failCount++;
                return null;
            }

            // Parse dates
            $purchaseDate = $this->parseDate($row['purchase_date'] ?? null);
            $expiryDate = $this->parseDate($row['expiry_date'] ?? null);
            $certificationDate = $this->parseDate($row['certification_date'] ?? null);

            $item = new PPEItem([
                'name' => trim($row['name']),
                'code' => strtoupper(trim($row['code'])),
                'category_id' => $categoryId,
                'size' => $row['size'] ?? null,
                'color' => $row['color'] ?? null,
                'material' => $row['material'] ?? null,
                'manufacturer' => $row['manufacturer'] ?? null,
                'model' => $row['model'] ?? null,
                'serial_number' => $row['serial_number'] ?? null,
                'location' => $row['location'] ?? null,
                'price' => is_numeric($row['price'] ?? '') ? (float) $row['price'] : null,
                'purchase_date' => $purchaseDate,
                'supplier' => $row['supplier'] ?? null,
                'description' => $row['description'] ?? null,
                'certification' => $row['certification'] ?? null,
                'certification_date' => $certificationDate,
                'expiry_date' => $expiryDate,
                'status' => in_array($row['status'] ?? '', ['available', 'assigned', 'maintenance', 'write_off'])
                    ? $row['status'] : 'available',
                'condition' => in_array($row['condition'] ?? '', ['good', 'fair', 'poor', 'damaged', 'expired'])
                    ? $row['condition'] : 'good',
                'created_by' => $this->importedBy,
            ]);

            $this->successCount++;

            // Create history log (after save)
            dispatch(function () use ($item) {
                PPEHistory::create([
                    'ppe_item_id' => $item->id,
                    'action_type' => 'created',
                    'new_data' => $item->toArray(),
                    'description' => "PPE '{$item->name}' imported via Excel",
                    'performed_by' => $this->importedBy,
                    'performed_by_name' => $this->importedByName,
                ]);
            });

            return $item;
        } catch (\Exception $e) {
            $this->errors[] = "Error importing '{$row['name']}': " . $e->getMessage();
            $this->failCount++;
            return null;
        }
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'category_code' => 'required|string|max:50',
            'status' => 'nullable|in:available,assigned,maintenance,write_off',
            'condition' => 'nullable|in:good,fair,poor,damaged,expired',
        ];
    }

    /**
     * Custom validation messages
     */
    public function customValidationMessages(): array
    {
        return [
            'name.required' => 'Item name is required',
            'code.required' => 'Item code is required',
            'category_code.required' => 'Category code is required',
        ];
    }

    /**
     * Batch size
     */
    public function batchSize(): int
    {
        return 50;
    }

    /**
     * Chunk size
     */
    public function chunkSize(): int
    {
        return 50;
    }

    /**
     * Get results
     */
    public function getResults(): array
    {
        return [
            'success_count' => $this->successCount,
            'fail_count' => $this->failCount,
            'errors' => $this->errors,
        ];
    }

    /**
     * Parse date from various formats
     */
    private function parseDate($value): ?string
    {
        if (empty($value)) return null;

        try {
            // If it's a numeric Excel date
            if (is_numeric($value)) {
                return Carbon::instance(\PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value))->format('Y-m-d');
            }
            // Try common formats
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }
}

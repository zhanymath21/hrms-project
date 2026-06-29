<?php

namespace App\Exports;

use App\Models\PPEItem;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Carbon\Carbon;

class PPEExport implements
    FromCollection,
    WithHeadings,
    WithMapping,
    WithStyles,
    WithColumnWidths,
    ShouldAutoSize
{
    private $filters;
    private $rowNumber = 0;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
    }

    /**
     * Get filtered data
     */
    public function collection()
    {
        $query = PPEItem::with(['category:id,name,code']);

        // Apply filters
        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('serial_number', 'like', "%{$search}%")
                    ->orWhere('current_holder_name', 'like', "%{$search}%")
                    ->orWhere('manufacturer', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if (!empty($this->filters['category_id'])) {
            $query->where('category_id', $this->filters['category_id']);
        }

        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (!empty($this->filters['condition'])) {
            $query->where('condition', $this->filters['condition']);
        }

        return $query->orderBy('name')->get();
    }

    /**
     * Headings row
     */
    public function headings(): array
    {
        return [
            'No',
            'Item Name',
            'Code',
            'Category',
            'Category Code',
            'Size',
            'Color',
            'Material',
            'Manufacturer',
            'Model',
            'Serial Number',
            'Location',
            'Holder Name',
            'Holder Department',
            'Holder Position',
            'Assigned Date',
            'Expected Return Date',
            'Price',
            'Purchase Date',
            'Supplier',
            'Description',
            'Certification',
            'Certification Date',
            'Expiry Date',
            'Status',
            'Condition',
            'Write-off Date',
            'Write-off Reason',
            'Created At',
            'Updated At',
        ];
    }

    /**
     * Map each row
     */
    public function map($item): array
    {
        $this->rowNumber++;

        return [
            $this->rowNumber,
            $item->name,
            $item->code,
            $item->category->name ?? '-',
            $item->category->code ?? '-',
            $item->size,
            $item->color,
            $item->material,
            $item->manufacturer,
            $item->model,
            $item->serial_number,
            $item->location,
            $item->current_holder_name,
            $item->current_holder_department,
            $item->current_holder_position,
            $item->assigned_at ? Carbon::parse($item->assigned_at)->format('Y-m-d') : '-',
            $item->expected_return_date ? Carbon::parse($item->expected_return_date)->format('Y-m-d') : '-',
            $item->price ? number_format($item->price, 2) : '-',
            $item->purchase_date ? Carbon::parse($item->purchase_date)->format('Y-m-d') : '-',
            $item->supplier,
            $item->description,
            $item->certification,
            $item->certification_date ? Carbon::parse($item->certification_date)->format('Y-m-d') : '-',
            $item->expiry_date ? Carbon::parse($item->expiry_date)->format('Y-m-d') : '-',
            ucfirst($item->status),
            ucfirst($item->condition),
            $item->write_off_date ? Carbon::parse($item->write_off_date)->format('Y-m-d') : '-',
            $item->write_off_reason ? ucfirst(str_replace('_', ' ', $item->write_off_reason)) : '-',
            Carbon::parse($item->created_at)->format('Y-m-d H:i:s'),
            Carbon::parse($item->updated_at)->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Style the spreadsheet
     */
    public function styles(Worksheet $sheet): array
    {
        $lastRow = $sheet->getHighestRow();
        $lastCol = $sheet->getHighestColumn();

        // Header style
        $sheet->getStyle('A1:' . $lastCol . '1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1976D2'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Header row height
        $sheet->getRowDimension(1)->setRowHeight(30);

        // Borders for all cells
        $sheet->getStyle('A1:' . $lastCol . $lastRow)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'DDDDDD'],
                ],
            ],
        ]);

        // Alternating row colors
        for ($row = 2; $row <= $lastRow; $row++) {
            if ($row % 2 == 0) {
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F5F5F5'],
                    ],
                ]);
            }
        }

        // Freeze first row
        $sheet->freezePane('A2');

        // Auto filter
        $sheet->setAutoFilter('A1:' . $lastCol . $lastRow);

        return [];
    }

    /**
     * Column widths
     */
    public function columnWidths(): array
    {
        return [
            'A' => 5,   // No
            'B' => 30,  // Item Name
            'C' => 15,  // Code
            'D' => 25,  // Category
            'E' => 15,  // Category Code
            'F' => 10,  // Size
            'G' => 15,  // Color
            'H' => 15,  // Material
            'I' => 20,  // Manufacturer
            'J' => 15,  // Model
            'K' => 20,  // Serial Number
            'L' => 25,  // Location
            'M' => 20,  // Holder Name
            'N' => 20,  // Holder Department
            'O' => 20,  // Holder Position
            'P' => 15,  // Assigned Date
            'Q' => 15,  // Expected Return Date
            'R' => 15,  // Price
            'S' => 15,  // Purchase Date
            'T' => 20,  // Supplier
            'U' => 30,  // Description
            'V' => 20,  // Certification
            'W' => 15,  // Certification Date
            'X' => 15,  // Expiry Date
            'Y' => 12,  // Status
            'Z' => 12,  // Condition
            'AA' => 15, // Write-off Date
            'AB' => 20, // Write-off Reason
            'AC' => 18, // Created At
            'AD' => 18, // Updated At
        ];
    }
}

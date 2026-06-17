<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmployeeDocumentController extends Controller
{
    /**
     * Get documents for employee
     */
    public function index($employeeId): JsonResponse
    {
        $documents = EmployeeDocument::where('employee_id', $employeeId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'employee_id' => $doc->employee_id,
                    'category_id' => $doc->category_id,       // ✅ Pakai category_id
                    'document_type' => $doc->category_id,       // ✅ Mapping ke document_type untuk frontend
                    'title' => $doc->title,
                    'description' => $doc->description,
                    'file_name' => $doc->file_name ?? basename($doc->file_path),
                    'file_url' => asset('storage/' . $doc->file_path),
                    'file_type' => $doc->file_type,
                    'file_size' => $doc->file_size,
                    'created_at' => $doc->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $documents,
        ]);
    }

    /**
     * Upload document
     */
    public function store(Request $request, $employeeId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'document_type' => 'required|string|max:100',  // ✅ document_type
            'title' => 'nullable|string|max:255',
            'file' => 'required|file|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $path = $file->store('employee-documents/' . $employeeId, 'public');

        $document = EmployeeDocument::create([
            'employee_id' => $employeeId,
            'document_type' => $request->document_type,  // ✅ document_type
            'title' => $request->title ?? $file->getClientOriginalName(),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => auth()->id() ?? auth('employee')->id(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Document uploaded successfully',
            'data' => $document,
        ], 201);
    }
    /**
     * Delete document
     */
    public function destroy($id): JsonResponse
    {
        $document = EmployeeDocument::find($id);

        if (!$document) {
            return response()->json([
                'status' => 'error',
                'message' => 'Document not found',
            ], 404);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Document deleted successfully',
        ]);
    }
}

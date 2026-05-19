<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadExcelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file'    => 'required_without:files|file|mimes:xlsx,xls|max:10240',
            'files'   => 'required_without:file|array|min:1|max:10',
            'files.*' => 'required|file|mimes:xlsx,xls|max:10240',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required_without' => 'Minimal satu file Excel harus diupload.',
            'file.file'             => 'Format upload tidak valid.',
            'file.mimes'            => 'Format file harus .xlsx atau .xls.',
            'file.max'              => 'Ukuran file maksimal 10MB per file.',
            'files.required'   => 'Minimal satu file Excel harus diupload.',
            'files.required_without' => 'Minimal satu file Excel harus diupload.',
            'files.array'      => 'Format upload tidak valid.',
            'files.max'        => 'Maksimal 10 file sekaligus.',
            'files.*.required' => 'File tidak boleh kosong.',
            'files.*.mimes'    => 'Format file harus .xlsx atau .xls.',
            'files.*.max'      => 'Ukuran file maksimal 10MB per file.',
        ];
    }
}

import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScriptUploadZone } from './ScriptUploadZone';
import { createMockFile } from '../../../tests/setup';

// Mock tRPC
const mockMutate = mock(() => Promise.resolve({
  fileId: 'script_123',
  uploadUrl: 'https://mock-upload.com/script_123',
  filePath: 'scripts/user_123/script_123'
}));

mock.module('../../lib/trpc', () => ({
  trpc: {
    scripts: {
      getUploadUrl: {
        mutate: mockMutate,
      },
      confirmUpload: {
        mutate: mock(() => Promise.resolve({ success: true })),
      },
      analyzeScript: {
        mutate: mock(() => Promise.resolve({ analysisId: 'analysis_123' })),
      },
    },
  },
}));

// Mock framer-motion
mock.module('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('ScriptUploadZone', () => {
  let mockOnFileAnalyzed: any;

  beforeEach(() => {
    mockOnFileAnalyzed = mock();
    mock.restore();
  });

  test('should render upload zone with correct UI elements', () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    expect(screen.getByText('Upload Script Files')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your script files here/)).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  test('should display supported file formats', () => {
    render(<ScriptUploadZone />);

    expect(screen.getByText(/Supported formats: PDF, DOC, DOCX, TXT, RTF/)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size: 50MB/)).toBeInTheDocument();
  });

  test('should handle file selection via browse button', async () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    const fileInput = screen.getByTestId('file-input');
    const testFile = createMockFile('mumbai_script.pdf', 2048000, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText('mumbai_script.pdf')).toBeInTheDocument();
    });
  });

  test('should handle drag and drop file upload', async () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    const dropZone = screen.getByTestId('drop-zone');
    const testFile = createMockFile('bollywood_script.docx', 1024000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(testFile);

    fireEvent.drop(dropZone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByText('bollywood_script.docx')).toBeInTheDocument();
    });
  });

  test('should validate file types and reject invalid files', async () => {
    render(<ScriptUploadZone />);

    const fileInput = screen.getByTestId('file-input');
    const invalidFile = createMockFile('script.exe', 1024, 'application/exe');

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/)).toBeInTheDocument();
    });
  });

  test('should validate file size and reject oversized files', async () => {
    render(<ScriptUploadZone maxSize={1024000} />); // 1MB limit

    const fileInput = screen.getByTestId('file-input');
    const oversizedFile = createMockFile('huge_script.pdf', 2048000, 'application/pdf'); // 2MB

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds the maximum allowed size/)).toBeInTheDocument();
    });
  });

  test('should respect maximum file count limit', async () => {
    render(<ScriptUploadZone maxFiles={2} />);

    const fileInput = screen.getByTestId('file-input');
    const files = [
      createMockFile('script1.pdf', 1024, 'application/pdf'),
      createMockFile('script2.pdf', 1024, 'application/pdf'),
      createMockFile('script3.pdf', 1024, 'application/pdf'), // Exceeds limit
    ];

    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Maximum number of files exceeded/)).toBeInTheDocument();
    });
  });

  test('should display upload progress', async () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    const fileInput = screen.getByTestId('file-input');
    const testFile = createMockFile('mumbai_drama.pdf', 1024000, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText('mumbai_drama.pdf')).toBeInTheDocument();
    });

    // Should show upload progress
    await waitFor(() => {
      expect(screen.getByText(/Uploading/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should show analysis progress after upload', async () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    const fileInput = screen.getByTestId('file-input');
    const testFile = createMockFile('casting_script.txt', 512000, 'text/plain');

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Processing/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('should handle Mumbai-specific script content', async () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    const fileInput = screen.getByTestId('file-input');
    const mumbaiScript = createMockFile('mumbai_love_story.pdf', 2048000, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [mumbaiScript] } });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        filename: 'mumbai_love_story.pdf',
        fileType: 'application/pdf',
        fileSize: 2048000,
      });
    });
  });

  test('should allow file removal before upload', async () => {
    render(<ScriptUploadZone />);

    const fileInput = screen.getByTestId('file-input');
    const testFile = createMockFile('removable_script.pdf', 1024000, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText('removable_script.pdf')).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText(/Remove file/);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('removable_script.pdf')).not.toBeInTheDocument();
    });
  });

  test('should retry failed uploads', async () => {
    // Mock a failed upload first
    mockMutate.mockRejectedValueOnce(new Error('Upload failed'));

    render(<ScriptUploadZone />);

    const fileInput = screen.getByTestId('file-input');
    const testFile = createMockFile('retry_script.pdf', 1024000, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Reset mock to succeed
    mockMutate.mockResolvedValueOnce({
      fileId: 'script_retry_123',
      uploadUrl: 'https://mock-upload.com/script_retry_123',
      filePath: 'scripts/user_123/script_retry_123'
    });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

  test('should call onFileAnalyzed callback when analysis completes', async () => {
    render(<ScriptUploadZone onFileAnalyzed={mockOnFileAnalyzed} />);

    const fileInput = screen.getByTestId('file-input');
    const testFile = createMockFile('callback_test.pdf', 1024000, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for the full upload and analysis cycle
    await waitFor(() => {
      expect(mockOnFileAnalyzed).toHaveBeenCalled();
    }, { timeout: 10000 });

    const callArgs = mockOnFileAnalyzed.mock.calls[0][0];
    expect(callArgs).toHaveProperty('status', 'completed');
    expect(callArgs).toHaveProperty('analysis');
  });

  test('should handle multiple file uploads simultaneously', async () => {
    render(<ScriptUploadZone maxFiles={3} />);

    const fileInput = screen.getByTestId('file-input');
    const files = [
      createMockFile('script1.pdf', 1024000, 'application/pdf'),
      createMockFile('script2.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      createMockFile('script3.txt', 256000, 'text/plain'),
    ];

    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText('script1.pdf')).toBeInTheDocument();
      expect(screen.getByText('script2.docx')).toBeInTheDocument();
      expect(screen.getByText('script3.txt')).toBeInTheDocument();
    });

    // Each file should trigger its own upload
    expect(mockMutate).toHaveBeenCalledTimes(3);
  });
});
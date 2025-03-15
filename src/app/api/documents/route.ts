import { NextResponse } from 'next/server';

// In a real application, you would fetch this from a database
// For this example, we'll use a mock list of documents
const mockDocuments = [
  {
    id: '1',
    name: 'Employee Handbook.pdf',
    uploadedAt: '2023-12-01T10:00:00Z',
    status: 'active',
    version: '1.0',
    fileType: '.pdf',
    size: 1024 * 1024 * 2, // 2MB
  },
  {
    id: '2',
    name: 'Privacy Policy.docx',
    uploadedAt: '2023-12-02T14:30:00Z',
    status: 'active',
    version: '2.1',
    fileType: '.docx',
    size: 1024 * 512, // 512KB
  },
  {
    id: '3',
    name: 'Security Guidelines.txt',
    uploadedAt: '2023-12-03T09:15:00Z',
    status: 'archived',
    version: '1.5',
    fileType: '.txt',
    size: 1024 * 100, // 100KB
  }
];

export async function GET() {
  // In a real application, you would fetch documents from a database
  return NextResponse.json({ documents: mockDocuments });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    );
  }
  
  // In a real application, you would delete the document from your database
  // and remove its vectors from Pinecone
  
  return NextResponse.json({ success: true });
} 
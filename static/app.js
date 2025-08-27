// Enhanced PDF Tool with PostgreSQL and User Authentication

const API_BASE_URL = window.location.origin;

// Import our enhanced components
// const EnhancedSearchComponent = require('./EnhancedSearchComponent');
const EnhancedPDFTools = window.EnhancedPDFTools || function FallbackComponent() {
    return React.createElement('div', {className: 'error-message'}, 
        'EnhancedPDFTools component not loaded correctly. Please check your console for errors.'
    );
};

/* ---------- Minimal accessible Login Modal ---------- */
function LoginModal({ visible, onClose, onSubmit }) {
  const refFirst = React.useRef(null);
  const [rememberMe, setRememberMe] = React.useState(!!localStorage.getItem('rememberUser'));
  
  React.useEffect(() => {
    if (!visible) return;
    const prev = document.activeElement;
    // focus first input for accessibility
    setTimeout(()=> refFirst.current?.focus(), 0);
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [visible, onClose]);

  if (!visible) return null;
  
  function handleSubmit(e){
    e.preventDefault();
    const data = { 
      email: e.target.email.value, 
      password: e.target.password.value,
      rememberMe: rememberMe 
    };
    // placeholder: replace with real auth handler
    if (onSubmit) onSubmit(data);
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onMouseDown={onClose} aria-hidden={false}>
      <div role="dialog" aria-modal="true" aria-label="Login" className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Login</h2>
          <button aria-label="Close login" onClick={onClose} className="p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="sr-only">Email</span>
            <input 
              ref={refFirst} 
              name="email" 
              type="email" 
              required 
              placeholder="Email" 
              defaultValue={localStorage.getItem('userEmail') || ''}
              className="w-full p-2 rounded border mb-3" 
            />
          </label>
          <label className="block text-sm">
            <span className="sr-only">Password</span>
            <input name="password" type="password" required placeholder="Password" className="w-full p-2 rounded mb-4 border" />
          </label>
          
          <div className="flex items-center mb-4">
            <input 
              id="remember-me-modal" 
              name="remember-me" 
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-red-500 focus:ring-red-400 border-gray-300 rounded" 
            />
            <label htmlFor="remember-me-modal" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
          
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
            <button type="submit" className="px-4 py-1 rounded bg-red-500 text-white">Sign in</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Minimal Register Modal (similar behavior) ---------- */
function RegisterModal({ visible, onClose, onSubmit }) {
  const refFirst = React.useRef(null);
  React.useEffect(() => {
    if (!visible) return;
    const prev = document.activeElement;
    setTimeout(()=> refFirst.current?.focus(), 0);
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [visible, onClose]);

  if (!visible) return null;
  
  function handleSubmit(e){
    e.preventDefault();
    const data = { email: e.target.email.value, password: e.target.password.value };
    if (onSubmit) onSubmit(data);
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Register" className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create account</h2>
          <button aria-label="Close register" onClick={onClose} className="p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <input ref={refFirst} name="email" type="email" required placeholder="Email" className="w-full p-2 rounded border mb-3" />
          <input name="password" type="password" required placeholder="Password" className="w-full p-2 rounded mb-4 border" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
            <button type="submit" className="px-4 py-1 rounded bg-red-500 text-white">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Enhanced PDF Processing Tools
const ENHANCED_TOOLS = [
    {
        id: 'enhanced_merge',
        name: 'Enhanced Merge PDFs',
        description: 'Merge multiple PDFs with advanced validation',
        icon: '📄',
        category: 'enhanced',
        allowMultiple: true,
        options: [
            {
                type: 'multiselect',
                name: 'file_keys',
                label: 'Select PDFs to merge',
                required: true,
                placeholder: 'Choose multiple PDF files'
            }
        ]
    },
    {
        id: 'enhanced_split',
        name: 'Enhanced Split PDF',
        description: 'Split PDF into individual pages with validation',
        icon: '✂️',
        category: 'enhanced',
        allowMultiple: false,
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to split',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'enhanced_convert',
        name: 'Enhanced Convert',
        description: 'Convert between document formats with validation',
        icon: '🔄',
        category: 'enhanced',
        allowMultiple: false,
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select file to convert',
                required: true,
                placeholder: 'Choose a file'
            },
            {
                type: 'select',
                name: 'target_format',
                label: 'Target format',
                required: true,
                options: [
                    { value: 'pdf', label: 'PDF' },
                    { value: 'pptx', label: 'PowerPoint' },
                    { value: 'docx', label: 'Word Document' },
                    { value: 'xlsx', label: 'Excel Spreadsheet' },
                    { value: 'jpg', label: 'JPEG Image' }
                ]
            }
        ]
    },
    {
        id: 'enhanced_workflow',
        name: 'Enhanced Workflow',
        description: 'Execute complex PDF processing workflows',
        icon: '⚙️',
        category: 'enhanced',
        allowMultiple: false,
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF for workflow',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'multiselect',
                name: 'operations',
                label: 'Select operations',
                required: true,
                options: [
                    { value: 'rotate_pdf', label: 'Rotate PDF' },
                    { value: 'watermark_pdf', label: 'Add Watermark' },
                    { value: 'compress_pdf', label: 'Compress PDF' },
                    { value: 'add_page_numbers', label: 'Add Page Numbers' },
                    { value: 'protect_pdf', label: 'Protect PDF' }
                ]
            }
        ]
    },
    {
        id: 'enhanced_bulk',
        name: 'Enhanced Bulk Processing',
        description: 'Process multiple files with the same operation',
        icon: '📦',
        category: 'enhanced',
        allowMultiple: true,
        options: [
            {
                type: 'multiselect',
                name: 'file_keys',
                label: 'Select files for bulk processing',
                required: true,
                placeholder: 'Choose multiple files'
            },
            {
                type: 'select',
                name: 'operation',
                label: 'Select operation',
                required: true,
                options: [
                    { value: 'merge_pdfs', label: 'Merge PDFs' },
                    { value: 'split_pdf', label: 'Split PDFs' },
                    { value: 'compress_pdf', label: 'Compress PDFs' },
                    { value: 'rotate_pdf', label: 'Rotate PDFs' },
                    { value: 'watermark_pdf', label: 'Add Watermarks' }
                ]
            }
        ]
    },
    {
        id: 'rotate_pdf',
        name: 'Rotate PDF',
        description: 'Rotate PDF pages by specified degrees',
        icon: '🔄',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to rotate',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'select',
                name: 'rotation',
                label: 'Rotation angle',
                required: true,
                options: [
                    { value: 90, label: '90° Clockwise' },
                    { value: 180, label: '180°' },
                    { value: 270, label: '270° Clockwise' }
                ]
            },
            {
                type: 'multiselect',
                name: 'pages',
                label: 'Pages to rotate (leave empty for all)',
                required: false,
                placeholder: 'Select specific pages'
            }
        ]
    },
    {
        id: 'compress_pdf',
        name: 'Compress PDF',
        description: 'Reduce PDF file size with basic compression',
        icon: '🗜️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to compress',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'watermark_pdf',
        name: 'Add Watermark',
        description: 'Add text watermark to PDF pages',
        icon: '💧',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF for watermark',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'text',
                name: 'watermark_text',
                label: 'Watermark text',
                required: true,
                placeholder: 'Enter watermark text'
            },
            {
                type: 'number',
                name: 'opacity',
                label: 'Opacity (0.1 - 1.0)',
                required: false,
                min: 0.1,
                max: 1.0,
                step: 0.1,
                default: 0.3
            },
            {
                type: 'number',
                name: 'font_size',
                label: 'Font size',
                required: false,
                min: 8,
                max: 72,
                default: 36
            }
        ]
    },
    {
        id: 'protect_pdf',
        name: 'Protect PDF',
        description: 'Encrypt PDF with password protection',
        icon: '🔒',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to protect',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'password',
                name: 'user_password',
                label: 'User password',
                required: true,
                placeholder: 'Enter password for users'
            },
            {
                type: 'password',
                name: 'owner_password',
                label: 'Owner password (optional)',
                required: false,
                placeholder: 'Enter password for owners'
            }
        ]
    },
    {
        id: 'unlock_pdf',
        name: 'Unlock PDF',
        description: 'Remove password protection from PDF',
        icon: '🔓',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to unlock',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'password',
                name: 'password',
                label: 'Current password',
                required: true,
                placeholder: 'Enter current password'
            }
        ]
    },
    {
        id: 'add_page_numbers',
        name: 'Add Page Numbers',
        description: 'Add page numbers to PDF',
        icon: '🔢',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF for page numbers',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'number',
                name: 'start',
                label: 'Starting page number',
                required: false,
                min: 1,
                default: 1
            },
            {
                type: 'select',
                name: 'position',
                label: 'Page number position',
                required: false,
                options: [
                    { value: 'bottom-right', label: 'Bottom Right' },
                    { value: 'bottom-center', label: 'Bottom Center' }
                ],
                default: 'bottom-right'
            }
        ]
    },
    {
        id: 'validate_pdf_a',
        name: 'Validate PDF/A',
        description: 'Check PDF/A compliance',
        icon: '✅',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to validate',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'convert_to_pdf_a',
        name: 'Convert to PDF/A',
        description: 'Convert PDF to PDF/A format',
        icon: '📋',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to convert',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'word_to_pdf',
        name: 'Word to PDF',
        description: 'Convert Word documents to PDF',
        icon: '📝',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Word document',
                required: true,
                placeholder: 'Choose a .docx file'
            }
        ]
    },
    {
        id: 'powerpoint_to_pdf',
        name: 'PowerPoint to PDF',
        description: 'Convert PowerPoint presentations to PDF',
        icon: '📊',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PowerPoint file',
                required: true,
                placeholder: 'Choose a .pptx file'
            }
        ]
    },
    {
        id: 'excel_to_pdf',
        name: 'Excel to PDF',
        description: 'Convert Excel spreadsheets to PDF',
        icon: '📈',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Excel file',
                required: true,
                placeholder: 'Choose a .xlsx or .xls file'
            }
        ]
    },
    {
        id: 'html_to_pdf',
        name: 'HTML to PDF',
        description: 'Convert HTML files to PDF',
        icon: '🌐',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select HTML file',
                required: true,
                placeholder: 'Choose a .html or .htm file'
            }
        ]
    },
    {
        id: 'pdf_to_powerpoint',
        name: 'PDF to PowerPoint',
        description: 'Convert PDF to PowerPoint presentation',
        icon: '📊',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to convert',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'extract_images',
        name: 'Extract Images',
        description: 'Extract embedded images from PDF',
        icon: '🖼️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF for image extraction',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'ocr_pdf_images',
        name: 'OCR PDF Images',
        description: 'Perform OCR on embedded images in PDF',
        icon: '👁️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF for OCR',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'repair_pdf',
        name: 'Repair PDF',
        description: 'Attempt to repair corrupted PDF files',
        icon: '🔧',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to repair',
                required: true,
                placeholder: 'Choose a PDF file'
            }
        ]
    },
    {
        id: 'sign_pdf',
        name: 'Sign PDF',
        description: 'Add digital signature to PDF',
        icon: '✍️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to sign',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'file',
                name: 'private_key_path',
                label: 'Private key file',
                required: true,
                accept: '.pem,.key'
            },
            {
                type: 'number',
                name: 'page_num',
                label: 'Page number for signature',
                required: true,
                min: 1,
                default: 1
            },
            {
                type: 'number',
                name: 'x',
                label: 'X coordinate',
                required: true,
                min: 0,
                max: 8.5,
                step: 0.1,
                default: 1
            },
            {
                type: 'number',
                name: 'y',
                label: 'Y coordinate',
                required: true,
                min: 0,
                max: 11,
                step: 0.1,
                default: 1
            }
        ]
    },
    {
        id: 'compare_pdfs',
        name: 'Compare PDFs',
        description: 'Compare two PDFs and show differences',
        icon: '🔍',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key1',
                label: 'First PDF',
                required: true,
                placeholder: 'Choose first PDF file'
            },
            {
                type: 'select',
                name: 'file_key2',
                label: 'Second PDF',
                required: true,
                placeholder: 'Choose second PDF file'
            }
        ]
    },
    {
        id: 'edit_pdf_add_text',
        name: 'Add Text to PDF',
        description: 'Add text overlay to specific PDF pages',
        icon: '✏️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to edit',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'number',
                name: 'page_num',
                label: 'Page number',
                required: true,
                min: 1,
                default: 1
            },
            {
                type: 'text',
                name: 'text',
                label: 'Text to add',
                required: true,
                placeholder: 'Enter text to add'
            },
            {
                type: 'number',
                name: 'x',
                label: 'X coordinate (inches)',
                required: true,
                min: 0,
                max: 8.5,
                step: 0.1,
                default: 1
            },
            {
                type: 'number',
                name: 'y',
                label: 'Y coordinate (inches)',
                required: true,
                min: 0,
                max: 11,
                step: 0.1,
                default: 1
            },
            {
                type: 'number',
                name: 'font_size',
                label: 'Font size',
                required: false,
                min: 8,
                max: 72,
                default: 12
            }
        ]
    },
    {
        id: 'fill_pdf_forms',
        name: 'Fill PDF Forms',
        description: 'Fill form fields in PDF documents',
        icon: '📋',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF with forms',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'json',
                name: 'field_data',
                label: 'Form field data (JSON)',
                required: true,
                placeholder: '{"field_name": "value"}'
            }
        ]
    },
    {
        id: 'annotate_pdf',
        name: 'Annotate PDF',
        description: 'Add annotations to PDF pages',
        icon: '📝',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to annotate',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'number',
                name: 'page_num',
                label: 'Page number',
                required: true,
                min: 1,
                default: 1
            },
            {
                type: 'select',
                name: 'annotation_type',
                label: 'Annotation type',
                required: true,
                options: [
                    { value: 'highlight', label: 'Highlight' },
                    { value: 'line', label: 'Line' }
                ]
            },
            {
                type: 'json',
                name: 'params',
                label: 'Annotation parameters (JSON)',
                required: true,
                placeholder: '{"x1": 0, "y1": 0, "x2": 1, "y2": 1, "color": "yellow"}'
            }
        ]
    },
    {
        id: 'redact_pdf',
        name: 'Redact PDF',
        description: 'Redact sensitive information from PDF',
        icon: '🚫',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to redact',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'number',
                name: 'page_num',
                label: 'Page number',
                required: true,
                min: 1,
                default: 1
            },
            {
                type: 'json',
                name: 'redactions',
                label: 'Redaction areas (JSON)',
                required: true,
                placeholder: '[[x1, y1, x2, y2], [x1, y1, x2, y2]]'
            }
        ]
    },
    {
        id: 'extract_text',
        name: 'Extract Text',
        description: 'Extract text content from PDF',
        icon: '📄',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF for text extraction',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'text',
                name: 'output_path',
                label: 'Output text file (optional)',
                required: false,
                placeholder: 'Leave empty to return text directly'
            }
        ]
    },
    {
        id: 'organize_pdf',
        name: 'Organize PDF',
        description: 'Reorganize PDF pages in custom order',
        icon: '📚',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF to organize',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'json',
                name: 'page_order',
                label: 'Page order (JSON array)',
                required: true,
                placeholder: '[1, 3, 2, 4]'
            }
        ]
    },
    {
        id: 'remove_pages',
        name: 'Remove Pages',
        description: 'Remove specific pages from PDF',
        icon: '🗑️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'json',
                name: 'pages_to_remove',
                label: 'Pages to remove (JSON array)',
                required: true,
                placeholder: '[2, 5, 8]'
            }
        ]
    },
    {
        id: 'extract_pages',
        name: 'Extract Pages',
        description: 'Extract specific pages from PDF',
        icon: '📄',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select PDF',
                required: true,
                placeholder: 'Choose a PDF file'
            },
            {
                type: 'json',
                name: 'pages',
                label: 'Pages to extract (JSON array)',
                required: true,
                placeholder: '[1, 3, 5]'
            }
        ]
    },
    {
        id: 'compress_image',
        name: 'Compress Image',
        description: 'Compress image files',
        icon: '🗜️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select image to compress',
                required: true,
                placeholder: 'Choose an image file'
            },
            {
                type: 'number',
                name: 'quality',
                label: 'Compression quality (1-100)',
                required: false,
                min: 1,
                max: 100,
                default: 80
            }
        ]
    },
    {
        id: 'resize_image',
        name: 'Resize Image',
        description: 'Resize image to specified dimensions',
        icon: '📏',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select image to resize',
                required: true,
                placeholder: 'Choose an image file'
            },
            {
                type: 'number',
                name: 'width',
                label: 'New width (pixels)',
                required: true,
                min: 1,
                default: 800
            },
            {
                type: 'number',
                name: 'height',
                label: 'New height (pixels)',
                required: true,
                min: 1,
                default: 600
            }
        ]
    },
    {
        id: 'crop_image',
        name: 'Crop Image',
        description: 'Crop image to specified area',
        icon: '✂️',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select image to crop',
                required: true,
                placeholder: 'Choose an image file'
            },
            {
                type: 'json',
                name: 'box',
                label: 'Crop box [left, top, right, bottom] (JSON array)',
                required: true,
                placeholder: '[100, 100, 500, 400]'
            }
        ]
    },
    {
        id: 'convert_image_format',
        name: 'Convert Image Format',
        description: 'Convert image to different format',
        icon: '🔄',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select image to convert',
                required: true,
                placeholder: 'Choose an image file'
            },
            {
                type: 'text',
                name: 'output_path',
                label: 'Output path with extension',
                required: true,
                placeholder: 'output.png'
            }
        ]
    },
    {
        id: 'ipynb_to_pdf',
        name: 'IPYNB to PDF',
        description: 'Convert Jupyter notebooks to PDF format',
        icon: '📓',
        category: 'enhanced',
        allowMultiple: false,
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Jupyter notebook',
                required: true,
                placeholder: 'Choose a .ipynb file'
            }
        ]
    },
    {
        id: 'ipynb_to_docx',
        name: 'IPYNB to DOCX',
        description: 'Convert Jupyter notebooks to Word documents',
        icon: '📝',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Jupyter notebook',
                required: true,
                placeholder: 'Choose a .ipynb file'
            }
        ]
    },
    {
        id: 'py_to_ipynb',
        name: 'Python to IPYNB',
        description: 'Convert Python files to Jupyter notebooks',
        icon: '🐍',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Python file',
                required: true,
                placeholder: 'Choose a .py file'
            }
        ]
    },
    {
        id: 'py_to_pdf',
        name: 'Python to PDF',
        description: 'Convert Python files to PDF with syntax highlighting',
        icon: '📄',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Python file',
                required: true,
                placeholder: 'Choose a .py file'
            }
        ]
    },
    {
        id: 'ipynb_to_py',
        name: 'IPYNB to Python',
        description: 'Extract Python code from Jupyter notebooks',
        icon: '💻',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Jupyter notebook',
                required: true,
                placeholder: 'Choose a .ipynb file'
            }
        ]
    },
    {
        id: 'py_to_docx',
        name: 'Python to DOCX',
        description: 'Convert Python files to Word documents with syntax highlighting',
        icon: '📝',
        category: 'enhanced',
        options: [
            {
                type: 'select',
                name: 'file_key',
                label: 'Select Python file',
                required: true,
                placeholder: 'Choose a .py file'
            }
        ]
    }
];

// Core Tools
const CORE_TOOLS = [
    {
        id: 'merge',
        name: 'Merge PDFs',
        description: 'Combine multiple PDF files into one document',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        category: 'core',
        options: []
    },
    {
        id: 'split',
        name: 'Split PDF',
        description: 'Split a PDF into multiple files by pages',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        category: 'core',
        options: [
            {
                type: 'text',
                name: 'pages',
                label: 'Page Range (e.g., 1-3,5,7-9)',
                required: false,
                placeholder: 'Leave empty to split every page'
            }
        ]
    },
    {
        id: 'compress',
        name: 'Compress PDF',
        description: 'Reduce PDF file size while maintaining quality',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        category: 'core',
        options: [
            {
                type: 'select',
                name: 'quality',
                label: 'Compression Quality',
                required: true,
                options: [
                    { value: 'low', label: 'Low (smaller file)' },
                    { value: 'medium', label: 'Medium (balanced)' },
                    { value: 'high', label: 'High (better quality)' }
                ]
            }
        ]
    },
    {
        id: 'rotate',
        name: 'Rotate PDF',
        description: 'Rotate PDF pages by 90, 180, or 270 degrees',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        category: 'core',
        options: [
            {
                type: 'select',
                name: 'angle',
                label: 'Rotation Angle',
                required: true,
                options: [
                    { value: '90', label: '90° Clockwise' },
                    { value: '180', label: '180°' },
                    { value: '270', label: '270° Clockwise' }
                ]
            }
        ]
    },
    {
        id: 'pdf_to_word',
        name: 'PDF to Word',
        description: 'Convert your PDF files to editable DOCX documents',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        category: 'core',
        options: []
    },
    {
        id: 'pdf_to_excel',
        name: 'PDF to Excel',
        description: 'Extract tables from PDF and convert to Excel spreadsheet',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M8 13V7"/><path d="M12 13V7"/><path d="M16 13V7"/></svg>,
        category: 'core',
        options: []
    },
    {
        id: 'pdf_to_jpg',
        name: 'PDF to JPG',
        description: 'Convert PDF pages to high-quality JPG images',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
        category: 'core',
        options: [
            {
                type: 'text',
                name: 'pages',
                label: 'Pages to Convert',
                required: false,
                placeholder: 'Leave empty for all pages (e.g., 1,3,5-7)'
            },
            {
                type: 'select',
                name: 'dpi',
                label: 'Image Quality (DPI)',
                required: true,
                options: [
                    { value: '100', label: '100 DPI (smaller files)' },
                    { value: '150', label: '150 DPI (balanced)' },
                    { value: '300', label: '300 DPI (high quality)' }
                ]
            }
        ]
    },
    {
        id: 'protect',
        name: 'Protect PDF',
        description: 'Add password protection and encrypt your PDF file',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
        category: 'core',
        options: [
            {
                type: 'password',
                name: 'password',
                label: 'Set Password',
                required: true,
                placeholder: 'Enter your password'
            }
        ]
    },
    {
        id: 'unlock',
        name: 'Unlock PDF',
        description: 'Remove password protection from encrypted PDFs',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M12 11v6"/><path d="M12 11l-2-2"/><path d="M12 11l2-2"/></svg>,
        category: 'core',
        options: [
            {
                type: 'password',
                name: 'password',
                label: 'PDF Password',
                required: true,
                placeholder: 'Enter the PDF password'
            }
        ]
    },
    {
        id: 'watermark',
        name: 'Add Watermark',
        description: 'Stamp text or image watermarks over your PDF',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
        category: 'core',
        options: [
            {
                type: 'text',
                name: 'text',
                label: 'Watermark Text',
                required: true,
                placeholder: 'e.g., CONFIDENTIAL, DRAFT, etc.'
            },
            {
                type: 'number',
                name: 'opacity',
                label: 'Opacity Level',
                required: true,
                options: [
                    { value: '0.1', label: 'Very Light (10%)' },
                    { value: '0.3', label: 'Light (30%)' },
                    { value: '0.5', label: 'Medium (50%)' },
                    { value: '0.7', label: 'Dark (70%)' }
                ]
            }
        ]
    },
    {
        id: 'page_numbers',
        name: 'Add Page Numbers',
        description: 'Automatically number all pages in your PDF',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        category: 'core',
        options: [
            {
                type: 'number',
                name: 'start',
                label: 'Starting Number',
                required: false,
                placeholder: '1'
            },
            {
                type: 'select',
                name: 'position',
                label: 'Number Position',
                required: false,
                options: [
                    { value: 'bottom-right', label: 'Bottom Right' },
                    { value: 'bottom-center', label: 'Bottom Center' },
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'top-right', label: 'Top Right' },
                    { value: 'top-center', label: 'Top Center' },
                    { value: 'top-left', label: 'Top Left' }
                ]
            }
        ]
    },
    {
        id: 'header_footer',
        name: 'Add Headers & Footers',
        description: 'Insert custom headers and footers on every page',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        category: 'core',
        options: [
            {
                type: 'text',
                name: 'header',
                label: 'Header Text',
                required: false,
                placeholder: 'e.g., Company Name, Document Title'
            },
            {
                type: 'text',
                name: 'footer',
                label: 'Footer Text',
                required: false,
                placeholder: 'e.g., Page X of Y, Date, Copyright'
            }
        ]
    },
    // AI-Powered Document Intelligence
    {
        id: 'chat_pdf',
        name: 'Chat with PDF',
        description: 'Ask questions about your PDF using AI',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h6"/></svg>,
        category: 'ai',
        options: [
            {
                type: 'text',
                name: 'question',
                label: 'Your Question',
                required: true,
                placeholder: 'Ask anything about your PDF content...'
            }
        ]
    },
    {
        id: 'analyze_pdf',
        name: 'AI Analysis',
        description: 'Get AI-powered summary, entities, and topics',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        category: 'ai',
        options: []
    },
    {
        id: 'classify_document',
        name: 'Document Classification',
        description: 'Automatically classify document type using ML',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        category: 'ai',
        options: []
    },
    // Workflow Automation
    {
        id: 'workflow',
        name: 'Automated Workflow',
        description: 'Chain multiple PDF operations automatically',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        category: 'ai',
        options: [
            {
                type: 'multiselect',
                name: 'commands',
                label: 'Workflow Steps',
                required: true,
                options: [
                    { value: 'unlock', label: 'Unlock PDF' },
                    { value: 'ocr', label: 'Run OCR' },
                    { value: 'compress', label: 'Compress' },
                    { value: 'watermark', label: 'Add Watermark' }
                ]
            }
        ]
    }
];

// Define AI tools placeholder (can be populated by advanced builds)
const AI_TOOLS = [];

// Update the tools array to include enhanced tools
const ALL_TOOLS = [...CORE_TOOLS, ...AI_TOOLS, ...ENHANCED_TOOLS];

// Make ALL_TOOLS available globally
if (typeof window !== 'undefined') {
    window.ALL_TOOLS = ALL_TOOLS;
}

// Improved search component
const EnhancedSearchComponent = () => {
    const [searchValue, setSearchValue] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [message, setMessage] = React.useState('');
    const [showResults, setShowResults] = React.useState(false);
    
    const handleSearch = (value) => {
        setSearchValue(value);
        setShowResults(true);
        
        if (!value.trim()) {
            setResults([]);
            setMessage('');
            setShowResults(false);
            return;
        }
        
        // Find matching tools
        const matches = ALL_TOOLS.filter(tool => 
            tool.name.toLowerCase().includes(value.toLowerCase()) || 
            tool.description.toLowerCase().includes(value.toLowerCase())
        );
        
        if (matches.length > 0) {
            setResults(matches);
            setMessage('');
        } else {
            setResults([]);
            setMessage(`No results found for "${value}"`);
        }
    };
    
    const handleAddItem = (toolId) => {
        // You can implement this to set the current tool or navigate to it
        if (window.setCurrentToolId) {
            window.setCurrentToolId(toolId);
        }
        setShowResults(false);
    };
    
    const handleSuggestNewTool = () => {
        // This could be extended to open a form or submit a suggestion
        alert(`Your suggestion for "${searchValue}" has been recorded. Thanks for helping us improve!`);
        setShowResults(false);
        setSearchValue('');
    };
    
    return (
        <div className="relative w-full sm:w-64">
            {/* Search input */}
            <div className="relative">
                <input
                    type="search"
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search for any tool..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring focus:ring-red-200 focus:border-red-500 transition-colors"
                />
                <div className="absolute left-3 top-2.5 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                </div>
            </div>
            
            {/* Results dropdown */}
            {showResults && (searchValue.trim() !== '') && (
                <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="p-2">
                            {results.map(tool => (
                                <div key={tool.id} className="p-2 hover:bg-gray-50 rounded flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{tool.name}</div>
                                        <div className="text-xs text-gray-500">{tool.description}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleAddItem(tool.id)}
                                        className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-gray-600 mb-3">{message}</p>
                            <button 
                                onClick={handleSuggestNewTool}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Suggest "{searchValue}"
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Safe icon renderer: supports both React elements and plain strings (emoji)
function renderIcon(icon, size = 48) {
    if (icon && typeof icon === 'object' && React.isValidElement(icon)) {
        return React.cloneElement(icon, { width: size, height: size });
    }
    if (typeof icon === 'string') {
        return React.createElement('span', { style: { fontSize: `${size}px`, lineHeight: 1 } }, icon);
    }
    return null;
}

// Reusable navigation bar to avoid duplicated header markup
function NavBar({ activeCategory, setActiveCategory, setSearchQuery, onOpenLogin, onOpenRegister, onToggleSettings, onToggleMobileMenu, mobileMenuOpen }) {
    return (
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-40 border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-4">
                        <a href="#" className="text-red-500 font-bold text-2xl flex items-center" aria-label="Home">
                            I<span className="text-red-400">❤️</span>PDF
                        </a>

                        <nav className="hidden lg:flex items-center gap-2" aria-label="Main menu">
                            <button onClick={() => setActiveCategory('organize')} className={`px-3 py-1 rounded-md text-sm ${activeCategory==='organize' ? 'bg-red-500 text-white' : 'hover:bg-gray-50'}`}>Organize</button>
                            <button onClick={() => setActiveCategory('optimize')} className={`px-3 py-1 rounded-md text-sm ${activeCategory==='optimize' ? 'bg-red-500 text-white' : 'hover:bg-gray-50'}`}>Optimize</button>
                            <button onClick={() => setActiveCategory('convert')} className={`px-3 py-1 rounded-md text-sm ${activeCategory==='convert' ? 'bg-red-500 text-white' : 'hover:bg-gray-50'}`}>Convert</button>
                            <button onClick={() => setActiveCategory('edit')} className={`px-3 py-1 rounded-md text-sm ${activeCategory==='edit' ? 'bg-red-500 text-white' : 'hover:bg-gray-50'}`}>Edit</button>
                            <button onClick={() => setActiveCategory('security')} className={`px-3 py-1 rounded-md text-sm ${activeCategory==='security' ? 'bg-red-500 text-white' : 'hover:bg-gray-50'}`}>Security</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 w-full max-w-2xl ml-4">
                        <div className="relative flex-1 hidden md:block">
                            <input aria-label="Search tools" type="search" onChange={(e)=>setSearchQuery(e.target.value)} placeholder="Search tools (merge, split, compress)..." className="w-full pl-10 pr-3 py-2 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.414 1.414-4.387-4.387zM8 14a6 6 0 100-12 6 6 0 000 12z"/></svg>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={onOpenLogin} aria-label="Login" title="Login" className="p-2 rounded-md hover:bg-gray-50">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>

                            <button onClick={onOpenRegister} aria-label="Sign up" title="Sign up" className="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600">Sign up</button>

                            <button onClick={onToggleSettings} aria-label="Settings" title="Settings" className="p-2 rounded-md hover:bg-gray-50 hidden sm:inline">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.12a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.12a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 017.7 2.7l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.12c0 .6.39 1.12 1 1.51h.42c.7.3 1.4.2 1.82-.33l.06-.06A2 2 0 0120.7 6.3l-.06.06a1.65 1.65 0 00-.33 1.82V9c.41.61.91 1 1.51 1H21a2 2 0 010 4h-.12c-.6 0-1.12.39-1.51 1z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>

                            <button onClick={onToggleMobileMenu} className="md:hidden p-2" aria-expanded={mobileMenuOpen ? "true" : "false"}>
                                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function App() {
    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [showLogin, setShowLogin] = React.useState(false);
    const [showRegister, setShowRegister] = React.useState(false);
    const [showForgotPassword, setShowForgotPassword] = React.useState(false);
    const [showSetNewPassword, setShowSetNewPassword] = React.useState(false);
    const [showMobileLogin, setShowMobileLogin] = React.useState(false);
    const [resetEmail, setResetEmail] = React.useState('');
    const [loginFormData, setLoginFormData] = React.useState(null);
    
    // App state
    const [currentToolId, setCurrentToolId] = React.useState(null);
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [collapsed, setCollapsed] = React.useState({ pdf: false, ai: false, enhanced: false });
    const [showSettings, setShowSettings] = React.useState(false);
    const [teams, setTeams] = React.useState([{ id: 't1', name: 'My Team' }]);
    const [language, setLanguage] = React.useState('EN');
    
    // Make setCurrentToolId available globally for the EnhancedSearchComponent
    if (typeof window !== 'undefined') {
        window.setCurrentToolId = setCurrentToolId;
    }
    
    // Filter tools based on active category and search query
    const filteredTools = React.useMemo(() => {
        let filtered = activeCategory === 'all' 
            ? ALL_TOOLS 
            : ALL_TOOLS.filter(t => (t.category || 'pdf') === activeCategory);
            
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(query) || 
                t.description.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [activeCategory, searchQuery]);
    
    const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
    const [files, setFiles] = React.useState([]);
    const [options, setOptions] = React.useState({});
    const [status, setStatus] = React.useState('idle');
    const [progress, setProgress] = React.useState(0);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [result, setResult] = React.useState(null);
    
    // Refs
    const fileInputRef = React.useRef(null);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    // Task polling helpers
    const pollCoreTask = React.useCallback((taskId, onProgress) => {
        let isCancelled = false;
        
        const promise = new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const interval = setInterval(async () => {
                if (isCancelled) {
                    clearInterval(interval);
                    return;
                }
                
                try {
                    const res = await fetch(`${API_BASE_URL}/task/${taskId}`, { 
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    if (isCancelled) {
                        clearInterval(interval);
                        return;
                    }
                    
                    if (!res.ok) {
                        clearInterval(interval);
                        return reject(new Error(await res.text()));
                    }
                    
                    const data = await res.json();
                    if (data.status === 'SUCCESS') {
                        clearInterval(interval);
                        resolve(data.result);
                    } else if (data.status === 'FAILURE') {
                        clearInterval(interval);
                        reject(new Error(data.error || 'Task failed'));
                    } else if (data.status === 'PROGRESS' && typeof onProgress === 'function') {
                        onProgress(data.progress || 0);
                    }
                    
                    if (Date.now() - startedAt > 5 * 60 * 1000) { // 5m timeout
                        clearInterval(interval);
                        reject(new Error('Task timeout'));
                    }
                } catch (e) {
                    if (!isCancelled) {
                        clearInterval(interval);
                        reject(e);
                    }
                }
            }, 1500);
            
            // Add timeout
            const timeout = setTimeout(() => {
                if (!isCancelled) {
                    clearInterval(interval);
                    reject(new Error('Polling timed out after 5 minutes'));
                }
            }, 5 * 60 * 1000);
            
            // Return cleanup function
            promise.cancel = () => {
                isCancelled = true;
                clearInterval(interval);
                clearTimeout(timeout);
            };
        });
        
        return promise;
    }, []);

    const pollAiTask = React.useCallback((taskId) => {
        let isCancelled = false;
        
        const promise = new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const interval = setInterval(async () => {
                if (isCancelled) {
                    clearInterval(interval);
                    return;
                }
                
                try {
                    const res = await fetch(`${API_BASE_URL}/api/task-status/${taskId}`, { 
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    if (isCancelled) {
                        clearInterval(interval);
                        return;
                    }
                    
                    if (!res.ok) {
                        clearInterval(interval);
                        return reject(new Error(await res.text()));
                    }
                    
                    const data = await res.json();
                    if (data.status === 'SUCCESS') {
                        clearInterval(interval);
                        resolve(data.result || data);
                    } else if (data.status === 'FAILURE') {
                        clearInterval(interval);
                        reject(new Error(data.error || 'Task failed'));
                    }
                    
                    if (Date.now() - startedAt > 5 * 60 * 1000) {
                        clearInterval(interval);
                        reject(new Error('Task timeout'));
                    }
                } catch (e) {
                    if (!isCancelled) {
                        clearInterval(interval);
                        reject(e);
                    }
                }
            }, 1500);
            
            // Add timeout
            const timeout = setTimeout(() => {
                if (!isCancelled) {
                    clearInterval(interval);
                    reject(new Error('Polling timed out after 5 minutes'));
                }
            }, 5 * 60 * 1000);
            
            // Return cleanup function
            promise.cancel = () => {
                isCancelled = true;
                clearInterval(interval);
                clearTimeout(timeout);
            };
        });
        
        return promise;
    }, []);

    // Simple i18n placeholder
    const t = React.useCallback((key) => {
        const dict = {
            EN: {
                welcome: 'Welcome',
                everyTool: 'Every tool you need to work with PDFs in one place',
                settings: 'Settings',
                logout: 'Logout',
                allTools: 'All Tools',
                pdfTools: 'PDF Tools',
                aiTools: 'AI Tools',
                enhanced: 'Enhanced',
                allPdf: 'All PDF',
                allAi: 'All AI',
                allEnhanced: 'All Enhanced',
                quickActions: 'Quick Actions',
                emptyTools: 'No tools found for this category.'
            }
        };
        return (dict[language] && dict[language][key]) || key;
    }, [language]);

    // Check authentication status on mount
    React.useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            console.log('Checking authentication status...');
            // First try the lightweight check
            let response = await fetch(`${API_BASE_URL}/auth/check`, { 
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            console.log('Auth check (/auth/check) status:', response.status);
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    setCurrentUser(data.user);
                    setIsAuthenticated(true);
                    return;
                }
            }
            // Fallback to /profile (older servers)
            response = await fetch(`${API_BASE_URL}/profile`, { 
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            console.log('Auth check fallback (/profile) status:', response.status);
            if (response.ok) {
                const userData = await response.json();
                setCurrentUser(userData);
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
                setCurrentUser(null);
                
                // Check if we have remembered credentials
                const rememberUser = localStorage.getItem('rememberUser');
                const userEmail = localStorage.getItem('userEmail');
                
                // If we have remembered user, show login modal pre-filled
                if (rememberUser && userEmail) {
                    console.log('Found remembered user, preparing auto-login prompt');
                    // Pre-fill the login form with the saved email
                    setLoginFormData({ username: userEmail, password: '' });
                    setShowLogin(true);
                }
            }
        } catch (error) {
            console.error('Authentication check failed:', error.message);
            setIsAuthenticated(false);
            setCurrentUser(null);
            // Provide fallback behavior
            console.log('Continuing as guest user');
        }
    };

    const handleLogin = async (credentials) => {
        try {
            console.log('Attempting login with:', credentials);
            
            // Extract rememberMe from credentials
            const { rememberMe, ...loginData } = credentials;
            
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // Add a header to indicate remember me preference
                    'X-Remember-Me': rememberMe ? 'true' : 'false'
                },
                body: JSON.stringify(loginData),
                credentials: 'include'
            });
            
            console.log('Login response status:', response.status);
            console.log('Login response headers:', response.headers);
            
            const responseText = await response.text();
            console.log('Login response text:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
            }
            
            if (response.ok) {
                console.log('Login successful:', responseData);
                
                // Store the remember me preference in localStorage if selected
                if (rememberMe) {
                    localStorage.setItem('rememberUser', 'true');
                    // You might want to store the user email for convenience
                    localStorage.setItem('userEmail', credentials.email || credentials.username);
                } else {
                    // Clear any saved preferences if not checked
                    localStorage.removeItem('rememberUser');
                    localStorage.removeItem('userEmail');
                }
                
                setIsAuthenticated(true);
                setShowLogin(false);
                checkAuthStatus();
            } else {
                console.error('Login failed:', responseData);
                throw new Error(responseData.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
        }
    };

    const handleRegister = async (userData) => {
        try {
            console.log('Attempting registration with:', userData);
            
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            console.log('Registration response status:', response.status);
            
            const responseText = await response.text();
            console.log('Registration response text:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
            }
            
            if (response.ok) {
                console.log('Registration successful:', responseData);
                alert('Registration successful! Please log in.');
                setShowRegister(false);
                setShowLogin(true);
            } else {
                console.error('Registration failed:', responseData);
                throw new Error(responseData.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert(`Registration failed: ${error.message}`);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/logout`, { credentials: 'include' });
            setIsAuthenticated(false);
            setCurrentUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const currentTool = React.useMemo(() => currentToolId ? ALL_TOOLS.find(t => t.id === currentToolId) : null, [currentToolId]);

    // Reset state when tool changes
    const resetState = React.useCallback(() => {
        setCurrentToolId(null);
        setFiles([]);
        setOptions({});
        setStatus('idle');
        setProgress(0);
        setErrorMessage('');
        setResult(null);
    }, []);

    // Initialize options when tool changes
    React.useEffect(() => {
        if (currentTool && currentTool.options && currentTool.options.length > 0) {
            const defaultOptions = currentTool.options.reduce((acc, opt) => {
                if (opt.type === 'select' && opt.options && opt.options.length > 0) {
                    acc[opt.name] = opt.options[0].value;
                } else if (opt.type === 'multiselect') {
                    acc[opt.name] = [];
                } else if (opt.type === 'password') {
                    acc[opt.name] = '';
                } else if (opt.type === 'text') {
                    acc[opt.name] = '';
                } else if (opt.type === 'number') {
                    acc[opt.name] = opt.default || '';
                } else if (opt.type === 'json') {
                    acc[opt.name] = opt.placeholder || '{}';
                } else if (opt.type === 'file') {
                    acc[opt.name] = null;
                }
                return acc;
            }, {});
            setOptions(defaultOptions);
        }
    }, [currentTool]);

    // Helper function to get accepted file types for a tool
    const getAcceptedFileTypes = React.useCallback((tool) => {
        if (!tool) return ['application/pdf'];
        
        // Default to PDF for most tools
        const pdfTools = [
            'merge', 'split', 'compress', 'rotate', 'protect', 'unlock', 'watermark',
            'pdf_to_word', 'pdf_to_excel', 'pdf_to_jpg', 'pdf_to_powerpoint',
            'extract_images', 'ocr_pdf_images', 'enhanced_merge', 'enhanced_split',
            'validate_pdf_a', 'convert_to_pdf_a', 'extract_text', 'repair_pdf',
            'sign_pdf', 'compare_pdfs', 'edit_pdf_add_text', 'fill_pdf_forms',
            'annotate_pdf', 'redact_pdf', 'organize_pdf', 'remove_pages', 
            'extract_pages', 'add_page_numbers', 'header_footer'
        ];
        
        // Tools that accept Word documents
        if (tool.id === 'word_to_pdf') {
            return ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
        }
        
        // Tools that accept PowerPoint presentations
        if (tool.id === 'powerpoint_to_pdf') {
            return ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'];
        }
        
        // Tools that accept Excel spreadsheets
        if (tool.id === 'excel_to_pdf') {
            return ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        }
        
        // Tools that accept images
        if (['compress_image', 'resize_image', 'crop_image', 'convert_image_format'].includes(tool.id)) {
            return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        }
        
        // Tools that accept Jupyter notebooks
        if (['ipynb_to_pdf', 'ipynb_to_docx', 'ipynb_to_py'].includes(tool.id)) {
            return ['application/x-ipynb+json', 'application/octet-stream'];
        }
        
        // Tools that accept Python files
        if (['py_to_ipynb', 'py_to_pdf', 'py_to_docx'].includes(tool.id)) {
            return ['text/x-python', 'application/x-python', 'text/plain'];
        }
        
        // Tools that accept HTML files
        if (tool.id === 'html_to_pdf') {
            return ['text/html'];
        }
        
        // Default to PDF for all other tools
        if (pdfTools.includes(tool.id)) {
            return ['application/pdf'];
        }
        
        // For enhanced_convert and other tools that might handle multiple formats
        return ['application/pdf', 'application/x-ipynb+json', 'text/x-python', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg', 'image/png', 'text/html'];
    }, []);

    // Helper function to get a user-friendly name for a file type
    const getFileTypeName = React.useCallback((mimeType) => {
        const fileTypeMap = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
            'application/msword': 'Word',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
            'application/vnd.ms-powerpoint': 'PowerPoint',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
            'application/vnd.ms-excel': 'Excel',
            'application/x-ipynb+json': 'Jupyter Notebook',
            'application/octet-stream': 'Jupyter Notebook',
            'text/x-python': 'Python',
            'application/x-python': 'Python',
            'text/plain': 'Text',
            'image/jpeg': 'JPEG image',
            'image/png': 'PNG image',
            'image/gif': 'GIF image',
            'image/webp': 'WebP image',
            'text/html': 'HTML'
        };
        return fileTypeMap[mimeType] || mimeType;
    }, []);

    // Check file extension as a fallback for MIME type issues
    const isValidFileByExtension = React.useCallback((filename, toolId) => {
        const extension = filename.split('.').pop().toLowerCase();
        
        if (['ipynb_to_pdf', 'ipynb_to_docx', 'ipynb_to_py'].includes(toolId) && extension === 'ipynb') {
            return true;
        }
        
        if (['py_to_ipynb', 'py_to_pdf', 'py_to_docx'].includes(toolId) && extension === 'py') {
            return true;
        }
        
        if (toolId === 'word_to_pdf' && ['doc', 'docx'].includes(extension)) {
            return true;
        }
        
        if (toolId === 'powerpoint_to_pdf' && ['ppt', 'pptx'].includes(extension)) {
            return true;
        }
        
        if (toolId === 'excel_to_pdf' && ['xls', 'xlsx'].includes(extension)) {
            return true;
        }
        
        if (toolId === 'html_to_pdf' && ['html', 'htm'].includes(extension)) {
            return true;
        }
        
        if (['compress_image', 'resize_image', 'crop_image', 'convert_image_format'].includes(toolId) && 
            ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            return true;
        }
        
        return false;
    }, []);

    const handleFilesAdded = React.useCallback((newFiles) => {
        if (!currentTool) {
            alert("Please select a tool first.");
            return;
        }
        
        // Get accepted file types for the current tool
        const acceptedTypes = getAcceptedFileTypes(currentTool);
        
        // Filter files based on accepted types and file extensions
        const validFiles = newFiles.filter(file => 
            acceptedTypes.includes(file.type) || 
            isValidFileByExtension(file.name, currentTool.id)
        );
        
        // Show error if any files were filtered out
        if (validFiles.length !== newFiles.length) {
            const fileTypeNames = acceptedTypes.map(getFileTypeName);
            const uniqueTypeNames = [...new Set(fileTypeNames)];
            
            alert(`For the ${currentTool.name} tool, only ${uniqueTypeNames.join(', ')} files are allowed.`);
        }
        
        // Add valid files to the state
        if (currentTool && !currentTool.allowMultiple) {
            setFiles(validFiles.slice(0, 1));
        } else {
            setFiles(prev => [...prev, ...validFiles]);
        }
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [currentTool, getAcceptedFileTypes, getFileTypeName, isValidFileByExtension]);

    const handleRemoveFile = React.useCallback((index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    // Core API interaction logic
    const handleSubmit = async () => {
        if (files.length === 0) return;
        
        // Check server health before processing
        try {
            // Try the standard health endpoint first
            let healthResponse = await fetch(`${API_BASE_URL}/health`, { 
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            // If that fails, try the backup health endpoint
            if (!healthResponse.ok) {
                console.log("Primary health check failed, trying backup endpoint...");
                healthResponse = await fetch(`${API_BASE_URL}/healthz`, { 
                    credentials: 'include',
                    headers: { 'Cache-Control': 'no-cache' }
                });
            }
            
            if (!healthResponse.ok) {
                setErrorMessage("Server health check failed. The service may be experiencing issues.");
                setStatus('error');
                return;
            }
        } catch (error) {
            console.error("Health check failed:", error);
            setErrorMessage("Cannot connect to the server. Please check your internet connection and try again.");
            setStatus('error');
            return;
        }
        
        setStatus('uploading');
        setErrorMessage('');
        setResult(null);
        setProgress(0);

        try {
            // Step 1: Upload all files with retry logic
            const uploadPromises = files.map(async (file, index) => {
                const formData = new FormData();
                formData.append('file', file);
                
                // Add retry logic for uploads
                let retries = 2;
                let uploadResponse;
                
                while (retries >= 0) {
                    try {
                        uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
                            method: 'POST',
                            body: formData,
                            credentials: 'include'
                        });
                        
                        if (uploadResponse.ok) break;
                        
                        retries--;
                        if (retries >= 0) {
                            console.log(`Upload retry for ${file.name}, remaining: ${retries}`);
                            await new Promise(r => setTimeout(r, 1000)); // Wait 1s between retries
                        }
                    } catch (err) {
                        retries--;
                        if (retries < 0) throw err;
                        console.log(`Upload error for ${file.name}, retrying...`, err);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                
                if (!uploadResponse || !uploadResponse.ok) {
                    const errText = await (uploadResponse ? uploadResponse.text() : "No response");
                    throw new Error(`Upload failed for ${file.name}: ${errText}`);
                }
                
                setProgress(prev => prev + (50 / files.length));
                return uploadResponse.json();
            });

            const uploadResults = await Promise.all(uploadPromises);
            const fileKeys = uploadResults.map(res => res.key);

            // Step 2: Start the processing task
            setStatus('processing');
            setProgress(50);

            const isAI = ['chat_pdf', 'analyze_pdf', 'classify_document', 'workflow'].includes(currentToolId);
            let task_id;
            
            if (isAI) {
                // AI processing logic unchanged
                const primaryFile = fileKeys[0];
                let primaryEndpoint = '';
                let fallbackEndpoint = '';
                let payload = {};
                if (currentToolId === 'chat_pdf') {
                    primaryEndpoint = '/advanced/chat-pdf';
                    fallbackEndpoint = '/api/chat-pdf';
                    payload = { file_key: primaryFile, question: options.question || '' };
                } else if (currentToolId === 'analyze_pdf') {
                    primaryEndpoint = '/advanced/analyze-pdf';
                    fallbackEndpoint = '/api/analyze-pdf';
                    payload = { file_key: primaryFile };
                } else if (currentToolId === 'classify_document') {
                    primaryEndpoint = '/advanced/classify-document';
                    fallbackEndpoint = '/api/classify-document';
                    payload = { file_key: primaryFile };
                } else if (currentToolId === 'workflow') {
                    primaryEndpoint = '/advanced/workflow';
                    fallbackEndpoint = '/api/workflow';
                    payload = { file_key: primaryFile, commands: options.commands || [] };
                }

                const postJSON = async (endpoint) => fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                let aiResp = await postJSON(primaryEndpoint);
                if (!aiResp.ok && aiResp.status === 404) {
                    aiResp = await postJSON(fallbackEndpoint);
                }
                if (!aiResp.ok) {
                    const errText = await aiResp.text();
                    throw new Error(`Processing failed: ${errText}`);
                }
                ({ task_id } = await aiResp.json());

                // Poll /api/task-status for AI jobs
                const pollTask = (taskId) => new Promise((resolve, reject) => {
                    const interval = setInterval(async () => {
                        try {
                            const statusResponse = await fetch(`${API_BASE_URL}/api/task-status/${taskId}`, { credentials: 'include' });
                            if (!statusResponse.ok) {
                                clearInterval(interval);
                                const errText = await statusResponse.text();
                                return reject(new Error(`Failed to get task status: ${errText}`));
                            }
                            const data = await statusResponse.json();
                            if (data.status === 'SUCCESS') {
                                clearInterval(interval);
                                setProgress(100);
                                resolve(data.result || data);
                            } else if (data.status === 'FAILURE') {
                                clearInterval(interval);
                                reject(new Error(data.error || 'Task failed without a specific error.'));
                            }
                        } catch (error) {
                            clearInterval(interval);
                            reject(error);
                        }
                    }, 2000);
                });
                const taskResult = await pollTask(task_id);
                setResult(taskResult);
                setStatus('success');
                return;
            } else {
                // Enhanced error handling for process endpoint
                let processResponse;
                let retries = 2;
                
                const processPayload = {
                    command: currentToolId,
                    file_keys: fileKeys,
                    params: options,
                };
                
                console.log("Processing request payload:", JSON.stringify(processPayload, null, 2));
                
                while (retries >= 0) {
                    try {
                        processResponse = await fetch(`${API_BASE_URL}/process`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(processPayload),
                            credentials: 'include'
                        });
                        
                        if (processResponse.ok) break;
                        
                        // If we get a 500 error, try a simpler payload format as fallback
                        if (processResponse.status === 500 && retries === 2) {
                            const simplePayload = {
                                command: currentToolId,
                                file_key: fileKeys[0],  // Try with just the first file
                            };
                            
                            console.log("Trying simplified payload:", JSON.stringify(simplePayload, null, 2));
                            
                            processResponse = await fetch(`${API_BASE_URL}/process`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(simplePayload),
                                credentials: 'include'
                            });
                            
                            if (processResponse.ok) break;
                        }
                        
                        retries--;
                        if (retries >= 0) {
                            console.log(`Process retry, remaining: ${retries}`);
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    } catch (err) {
                        retries--;
                        if (retries < 0) throw err;
                        console.log("Process error, retrying...", err);
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }

                if (!processResponse || !processResponse.ok) {
                    let errText = await (processResponse ? processResponse.text() : "No response");
                    console.error("Process response error:", processResponse ? processResponse.status : "No response", errText);
                    
                    // Provide more helpful error message
                    if (processResponse && processResponse.status === 500) {
                        errText = "The server encountered an internal error. This might be due to file format issues, server load, or unsupported operations. Please try a different file or try again later.";
                    }
                    
                    throw new Error(`Processing failed: ${errText}`);
                }

                const processData = await processResponse.json();
                task_id = processData.task_id;

                // Improved task polling with timeout and error handling
                const pollTask = (taskId) => new Promise((resolve, reject) => {
                    const startTime = Date.now();
                    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
                    
                    const interval = setInterval(async () => {
                        try {
                            if (Date.now() - startTime > maxWaitTime) {
                                clearInterval(interval);
                                return reject(new Error("Task timed out after 5 minutes"));
                            }
                            
                            const statusResponse = await fetch(`${API_BASE_URL}/task/${taskId}`, { 
                                credentials: 'include',
                                headers: { 'Cache-Control': 'no-cache' } // Prevent caching
                            });
                            
                            if (!statusResponse.ok) {
                                clearInterval(interval);
                                const errText = await statusResponse.text();
                                return reject(new Error(`Failed to get task status: ${errText}`));
                            }
                            
                            const data = await statusResponse.json();
                            console.log("Task status:", data);
                            
                            if (data.status === 'SUCCESS') {
                                clearInterval(interval);
                                setProgress(100);
                                resolve(data.result);
                            } else if (data.status === 'FAILURE') {
                                clearInterval(interval);
                                reject(new Error(data.error || 'Task failed without a specific error.'));
                            } else if (data.status === 'PROGRESS') {
                                setProgress(50 + (data.progress / 2));
                            }
                        } catch (error) {
                            console.error("Error polling task:", error);
                            // Don't reject immediately on polling errors, just log and continue
                            // Only reject if we've been trying for too long
                            if (Date.now() - startTime > maxWaitTime) {
                                clearInterval(interval);
                                reject(error);
                            }
                        }
                    }, 2000);
                });

                const taskResult = await pollTask(task_id);
                setResult(taskResult);
                setStatus('success');
            }

        } catch (error) {
            console.error("An error occurred:", error);
            setErrorMessage(error.message || "An unknown error occurred during processing");
            setStatus('error');
        }
    };
    
    const handleRetry = () => {
        setStatus('idle');
        setErrorMessage('');
    };

    // Render Logic
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans">
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">PDF Tool</h1>
                        <p className="mt-2 text-lg text-gray-600">Professional PDF processing with user accounts</p>
                    </div>
                </header>
                
                <main className="max-w-md mx-auto py-12 px-4">
                    {showLogin ? (
                        <LoginForm 
                            onLogin={handleLogin} 
                            onSwitchToRegister={() => setShowRegister(true)} 
                            onForgotPassword={() => setShowForgotPassword(true)}
                            onMobileLogin={() => setShowMobileLogin(true)}
                            initialData={loginFormData}
                        />
                    ) : showRegister ? (
                        <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setShowLogin(true)} />
                    ) : showForgotPassword ? (
                        <RequestResetView 
                            onBackToLogin={() => setShowForgotPassword(false)} 
                            onResetSent={(email) => {
                                setResetEmail(email);
                                setShowForgotPassword(false);
                                setShowSetNewPassword(true);
                            }} 
                        />
                    ) : showSetNewPassword ? (
                        <SetNewPasswordView 
                            email={resetEmail} 
                            onPasswordReset={() => {
                                setShowSetNewPassword(false);
                                setShowLogin(true);
                            }} 
                            onBackToLogin={() => setShowSetNewPassword(false)} 
                        />
                    ) : showMobileLogin ? (
                        <MobileLoginView 
                            onBackToLogin={() => setShowMobileLogin(false)} 
                            onLoginSuccess={(user) => {
                                setCurrentUser(user);
                                setIsAuthenticated(true);
                                setShowMobileLogin(false);
                            }} 
                        />
                    ) : (
                        <div className="text-center">
                            <button 
                                onClick={() => setShowLogin(true)}
                                className="bg-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors mr-4"
                            >
                                Login
                            </button>
                            <button 
                                onClick={() => setShowRegister(true)}
                                className="bg-gray-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                            >
                                Register
                            </button>
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // Home View: Show all available tools
    if (!currentTool) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans">
                <NavBar
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    setSearchQuery={setSearchQuery}
                    onOpenLogin={() => setShowLogin(true)}
                    onOpenRegister={() => setShowRegister(true)}
                    onToggleSettings={() => setShowSettings(prev=>!prev)}
                    onToggleMobileMenu={() => setMobileMenuOpen(prev=>!prev)}
                    mobileMenuOpen={mobileMenuOpen}
                />
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t p-4 space-y-2">
                        {Object.entries(MENU_TOOLS).map(([category, tools]) => (
                            <div key={category}>
                                <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider px-2 py-1">{category}</h3>
                                {tools.map(tool => (
                                    <a key={tool.id} href="#" onClick={(e)=>{e.preventDefault(); setCurrentToolId(tool.id); setMobileMenuOpen(false);}} className="block py-2 px-2 rounded-md hover:bg-red-50">{tool.name}</a>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
                
                <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <section className="text-center px-6 py-8 md:py-12 max-w-4xl mx-auto">
                        <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">Every tool you need to work with PDFs in one place</h1>
                        <p className="text-base md:text-lg text-gray-600 mb-6 max-w-3xl mx-auto">Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button onClick={() => setActiveCategory('all')} className="bg-red-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-red-600 transition-all">Explore All PDF Tools</button>
                        </div>
                    </section>
                    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[
                                ...MENU_TOOLS.organize,
                                ...MENU_TOOLS.optimize,
                                ...MENU_TOOLS.convert,
                                ...MENU_TOOLS.edit,
                                ...MENU_TOOLS.security
                            ].slice(0,12).map((tool) => (
                                <div key={tool.id} onClick={() => setCurrentToolId(tool.id)} className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                                    <div className="text-red-500 mb-4">
                                        <svg width="32" height="32" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M4 4h16v16H4z" strokeWidth="2"/><path d="M8 8h8M8 12h6" strokeWidth="2"/></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{tool.name}</h3>
                                    <p className="text-gray-500 text-sm">Quickly run the {tool.name.toLowerCase()} tool.</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Sidebar removed per request; menu is in sticky header dropdowns */}
                        
                        <div className="col-span-4">
                            <h2 className="text-2xl font-bold mb-6">PDF Tools</h2>
                            
                            {/* Enhanced PDF Tools Component with error boundary */}
                            <div className="component-container">
                                {(() => {
                                    try {
                                        return (
                                            <EnhancedPDFTools 
                                                allTools={ALL_TOOLS}
                                                onSelectTool={setCurrentToolId}
                                                onSuggestTool={(suggestion) => {
                                                    console.log('Tool suggestion:', suggestion);
                                                    alert(`Thank you for suggesting "${suggestion}". We'll consider adding this tool!`);
                                                }}
                                                searchQuery={searchQuery}
                                                category="pdf"
                                                featuredToolIds={['merge', 'split', 'compress', 'rotate']}
                                            />
                                        );
                                    } catch (err) {
                                        console.error('Error rendering EnhancedPDFTools:', err);
                                        return (
                                            <div className="error-message p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                                                Error rendering PDF Tools component. Please check the console for details.
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                        <section className="md:col-span-3">
                            <div className="bg-white border rounded-lg p-4 mb-6">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('quickActions')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['merge','split','compress','rotate','watermark','page_numbers'].map(id => (
                                        <button key={id} onClick={()=> setCurrentToolId(id)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                                            {ALL_TOOLS.find(t => t.id===id)?.name || id}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Search bar and filters */}
                            <div className="bg-white border rounded-lg p-4 mb-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    {/* Replace basic search with enhanced interactive search */}
                                    <EnhancedSearchComponent />
                                    <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto" role="toolbar" aria-label="Filter tools">
                                        <button 
                                            onClick={() => setActiveCategory('all')}
                                            className={`whitespace-nowrap px-3 py-1.5 text-sm border rounded-full transition-colors ${activeCategory === 'all' ? 'bg-red-500 text-white border-red-500' : 'hover:bg-gray-50 border-gray-300'}`}
                                        >
                                            All Tools
                                        </button>
                                        <button 
                                            onClick={() => setActiveCategory('pdf')}
                                            className={`whitespace-nowrap px-3 py-1.5 text-sm border rounded-full transition-colors ${activeCategory === 'pdf' ? 'bg-red-500 text-white border-red-500' : 'hover:bg-gray-50 border-gray-300'}`}
                                        >
                                            PDF Tools
                                        </button>
                                        <button 
                                            onClick={() => setActiveCategory('enhanced')}
                                            className={`whitespace-nowrap px-3 py-1.5 text-sm border rounded-full transition-colors ${activeCategory === 'enhanced' ? 'bg-red-500 text-white border-red-500' : 'hover:bg-gray-50 border-gray-300'}`}
                                        >
                                            Enhanced
                                        </button>
                                        <button 
                                            onClick={() => setActiveCategory('ai')}
                                            className={`whitespace-nowrap px-3 py-1.5 text-sm border rounded-full transition-colors ${activeCategory === 'ai' ? 'bg-red-500 text-white border-red-500' : 'hover:bg-gray-50 border-gray-300'}`}
                                        >
                                            AI Tools
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {filteredTools.length === 0 ? (
                                <div className="text-center text-gray-600 bg-white border rounded-lg p-12 flex flex-col items-center justify-center gap-4">
                                    <div>No tool found for "{searchQuery}".</div>
                                    {searchQuery && (
                                        <button
                                            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                            onClick={() => alert(`Suggesting new tool: ${searchQuery}`)}
                                        >
                                            Add "{searchQuery}"
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
                                    {filteredTools.map(tool => (
                                        <ToolCard key={tool.id} toolId={tool.id} onSelect={setCurrentToolId} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
                <footer className="bg-gray-800 text-white mt-10">
                    <div className="max-w-7xl mx-auto px-6 py-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div>
                                <h3 className="font-bold mb-4">I❤️PDF</h3>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Home</a>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Features</a>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Pricing</a>
                            </div>
                            <div>
                                <h3 className="font-bold mb-4">SOLUTIONS</h3>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Business</a>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Education</a>
                            </div>
                            <div>
                                <h3 className="font-bold mb-4">COMPANY</h3>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">About</a>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Contact Us</a>
                            </div>
                            <div>
                                <h3 className="font-bold mb-4">HELP</h3>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">FAQ</a>
                                <a href="#" className="block text-gray-300 hover:text-white text-sm py-1">Help Center</a>
                            </div>
                        </div>
                        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
                            &copy; {new Date().getFullYear()} I❤️PDF. All Rights Reserved.
                        </div>
                    </div>
                </footer>

                {showSettings && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" role="dialog" aria-modal="true">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Settings</h3>
                                <button onClick={()=> setShowSettings(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-medium text-gray-800 mb-2">Teams</h4>
                                    <ul className="space-y-1 mb-3">
                                        {teams.map(t => <li key={t.id} className="text-sm text-gray-700">{t.name}</li>)}
                                    </ul>
                                    <div className="flex gap-2">
                                        <input id="new-team-name" className="flex-1 px-3 py-2 border rounded" placeholder="New team name" />
                                        <button onClick={()=>{
                                            const input = document.getElementById('new-team-name');
                                            const name = (input && input.value || '').trim();
                                            if(!name) return;
                                            setTeams(prev=> [...prev, { id: `t_${Date.now()}`, name }]);
                                            input.value='';
                                        }} className="px-3 py-2 bg-gray-800 text-white rounded">Create</button>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-800 mb-2">Language</h4>
                                    <select value={language} onChange={(e)=> setLanguage(e.target.value)} className="px-3 py-2 border rounded">
                                        <option value="EN">English</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 text-right">
                                <button onClick={()=> setShowSettings(false)} className="px-4 py-2 border rounded">Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Login Modal */}
                <LoginModal
                    visible={showLogin}
                    onClose={() => setShowLogin(false)}
                    onSubmit={handleLogin}
                />
                
                {/* Register Modal */}
                <RegisterModal
                    visible={showRegister}
                    onClose={() => setShowRegister(false)}
                    onSubmit={handleRegister}
                />
            </div>
        );
    }
    
    // Tool View: The main interface for a selected tool
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={resetState} className="flex items-center text-gray-600 hover:text-gray-900 font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
                        Back to all tools
                    </button>
                    <span className="text-sm text-gray-500">Logged in as {currentUser?.username}</span>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">{currentTool.name}</h1>
                        <p className="text-gray-500 mt-2">{currentTool.description}</p>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => handleFilesAdded(Array.from(e.target.files))}
                        multiple={currentTool.allowMultiple}
                        accept=".pdf,.ipynb,.py,.docx,.pptx,.xlsx,.xls,.html,.htm,.jpg,.jpeg,.png,.gif"
                    />

                    {status === 'idle' && (
                        <>
                            {files.length === 0 ? (
                                <Dropzone onFilesAdded={handleFilesAdded} tool={currentTool} onSelectClick={() => fileInputRef.current.click()}/>
                            ) : (
                                <div>
                                    {files.map((file, index) => (
                                        <FileItem key={index} file={file} onRemove={() => handleRemoveFile(index)} />
                                    ))}
                                    {currentTool.allowMultiple && (
                                        <button onClick={() => fileInputRef.current.click()} className="w-full mt-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition-colors">
                                            Add more files
                                        </button>
                                    )}
                                </div>
                            )}

                            {files.length > 0 && (
                                <>
                                    <ToolOptions tool={currentTool} options={options} setOptions={setOptions} />
                                    {files.length > 1 && (
                                        <div className="relative mt-2">
                                            <details>
                                                <summary className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border rounded bg-white">Process <span className="text-gray-400">▼</span></summary>
                                                <div className="absolute mt-2 w-48 bg-white border rounded shadow z-10">
                                                    <button onClick={async ()=>{
                                                        // Merge PDFs
                                                        setStatus('processing');
                                                        try {
                                                            const formDataResults = await Promise.all(files.map(async (file)=>{
                                                                const fd = new FormData(); fd.append('file', file);
                                                                const r = await fetch(`${API_BASE_URL}/upload`, { method:'POST', body: fd, credentials:'include' });
                                                                if(!r.ok) throw new Error(await r.text());
                                                                return r.json();
                                                            }));
                                                            const keys = formDataResults.map(r=> r.key);
                                                            const resp = await fetch(`${API_BASE_URL}/process`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ command: 'merge', file_keys: keys, params: {} }) });
                                                            if(!resp.ok) throw new Error(await resp.text());
                                                            const { task_id } = await resp.json();
                                                            const poll = (taskId) => new Promise((resolve, reject)=>{
                                                                const i = setInterval(async ()=>{
                                                                    const s = await fetch(`${API_BASE_URL}/task/${taskId}`, { credentials:'include' });
                                                                    if(!s.ok){ clearInterval(i); return reject(new Error(await s.text())); }
                                                                    const d = await s.json();
                                                                    if(d.status==='SUCCESS'){ clearInterval(i); setProgress(100); resolve(d.result); }
                                                                }, 1500);
                                                            });
                                                            const taskRes = await poll(task_id);
                                                            setResult(taskRes); setStatus('success');
                                                        } catch(err){
                                                            setErrorMessage(err.message||String(err)); setStatus('error');
                                                        }
                                                    }} className="block w-full text-left px-3 py-2 hover:bg-gray-50">Merge PDFs</button>
                                                    <button onClick={async ()=>{
                                                        if(files.length<1) return;
                                                        setStatus('processing');
                                                        try {
                                                            const fd = new FormData(); fd.append('file', files[0]);
                                                            const up = await fetch(`${API_BASE_URL}/upload`, { method:'POST', body: fd, credentials:'include' });
                                                            if(!up.ok) throw new Error(await up.text());
                                                            const { key } = await up.json();
                                                            const resp = await fetch(`${API_BASE_URL}/process`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ command: 'compress', file_keys: [key], params: {} }) });
                                                            if(!resp.ok) throw new Error(await resp.text());
                                                            const { task_id } = await resp.json();
                                                            const poll = (taskId) => new Promise((resolve, reject)=>{
                                                                const i = setInterval(async ()=>{
                                                                    const s = await fetch(`${API_BASE_URL}/task/${taskId}`, { credentials:'include' });
                                                                    if(!s.ok){ clearInterval(i); return reject(new Error(await s.text())); }
                                                                    const d = await s.json();
                                                                    if(d.status==='SUCCESS'){ clearInterval(i); setProgress(100); resolve(d.result); }
                                                                }, 1500);
                                                            });
                                                            const taskRes = await poll(task_id);
                                                            setResult(taskRes); setStatus('success');
                                                        } catch(err){ setErrorMessage(err.message||String(err)); setStatus('error'); }
                                                    }} className="block w-full text-left px-3 py-2 hover:bg-gray-50">Compress</button>
                                                </div>
                                            </details>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSubmit}
                                        className="w-full mt-8 py-4 bg-red-500 text-white text-lg font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md"
                                    >
                                        {currentTool.name}
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {['uploading', 'processing'].includes(status) && (
                         <>
                             <div className="text-center py-10">
                                 <h2 className="text-2xl font-semibold text-gray-800 mb-4 capitalize">{status}...</h2>
                                 <div className="w-full bg-gray-200 rounded-full h-4" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} role="progressbar">
                                     <div className="bg-red-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                 </div>
                                 <p className="mt-2 text-gray-600">{Math.round(progress)}%</p>
                             </div>

                             {/* Modal overlay */}
                             <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" role="dialog" aria-modal="true" aria-label="Processing">
                                 <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                                     <h3 className="text-lg font-semibold mb-2 capitalize">{status}</h3>
                                     <p className="text-sm text-gray-600 mb-4">Please wait while we process your files.</p>
                                     <div className="w-full bg-gray-200 rounded-full h-3" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} role="progressbar">
                                         <div className="bg-red-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                     </div>
                                     <p className="mt-2 text-gray-600 text-right text-sm">{Math.round(progress)}%</p>
                                 </div>
                             </div>
                         </>
                    )}

                    {status === 'success' && result && (
                         <div className="text-center py-10">
                             <h2 className="text-2xl font-bold text-green-600 mb-4">Processing Complete!</h2>
                             {result.key ? (
                               <>
                                 <p className="text-gray-700 mb-6">Your file is ready for download.</p>
                                 <a
                                     href={`${API_BASE_URL}/download?key=${result.key}`}
                                     download={result.filename}
                                     className="inline-block px-10 py-4 bg-red-500 text-white text-lg font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md"
                                 >
                                     Download File
                                 </a>
                                 {typeof result.size === 'number' && (
                                   <p className="text-sm text-gray-500 mt-4">Size: {formatBytes(result.size)}</p>
                                 )}
                               </>
                             ) : (
                               <div className="text-left mx-auto max-w-xl">
                                  <p className="text-gray-700 mb-3">AI Result</p>
                                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
{JSON.stringify(result, null, 2)}
                                  </pre>
                               </div>
                             )}
                         </div>
                    )}
                    
                    {status === 'error' && (
                          <div className="text-center py-10">
                              <h2 className="text-2xl font-bold text-red-600 mb-4">An Error Occurred</h2>
                              <p className="text-gray-700 bg-red-100 p-4 rounded-md">{errorMessage}</p>
                              
                              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <button onClick={handleRetry} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">
                                      Try Again
                                  </button>
                                  
                                  <button 
                                      onClick={() => {
                                          // Try with a simpler tool
                                          if (files.length > 0) {
                                              setCurrentToolId('compress');
                                              setOptions({quality: 'medium'});
                                              setStatus('idle');
                                              setErrorMessage('');
                                          }
                                      }} 
                                      className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
                                  >
                                      Try Simple Compression
                                  </button>
                              </div>
                              
                              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4 text-left">
                                  <h3 className="font-medium text-yellow-800 mb-2">Troubleshooting Tips:</h3>
                                  <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
                                      <li>Check if your file format is supported</li>
                                      <li>Try with a smaller file (under 10MB)</li>
                                      <li>The server might be experiencing high load</li>
                                      <li>Check your internet connection</li>
                                      <li>Try again in a few minutes</li>
                                  </ul>
                              </div>
                          </div>
                    )}
                </div>
            </div>
            
            {/* Login Modal */}
            <LoginModal
                visible={showLogin}
                onClose={() => setShowLogin(false)}
                onSubmit={handleLogin}
            />
            
            {/* Register Modal */}
            <RegisterModal
                visible={showRegister}
                onClose={() => setShowRegister(false)}
                onSubmit={handleRegister}
            />
        </div>
    );
}

// Authentication Components
const LoginForm = ({ onLogin, onSwitchToRegister, onForgotPassword, onMobileLogin, initialData }) => {
    const [formData, setFormData] = React.useState(initialData || { username: '', password: '' });
    const [rememberMe, setRememberMe] = React.useState(!!localStorage.getItem('rememberUser'));

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin({ ...formData, rememberMe });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                
                <div className="flex items-center">
                    <input 
                        id="remember-me" 
                        name="remember-me" 
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-red-500 focus:ring-red-400 border-gray-300 rounded" 
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                        Remember me
                    </label>
                </div>
                
                <button
                    type="submit"
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                    Login
                </button>
            </form>
            
            <div className="mt-4 space-y-3">
                <div className="text-center">
                    <button onClick={onForgotPassword} className="text-red-500 hover:text-red-600 text-sm">
                        Forgot Password?
                    </button>
                </div>
                <div className="text-center">
                    <button onClick={onMobileLogin} className="text-blue-500 hover:text-blue-600 text-sm">
                        Login with Mobile
                    </button>
                </div>
                <p className="text-center text-gray-600">
                    Don't have an account?{' '}
                    <button onClick={onSwitchToRegister} className="text-red-500 hover:text-red-600">
                        Register here
                    </button>
                </p>
            </div>
        </div>
    );
};

const RegisterForm = ({ onRegister, onSwitchToLogin }) => {
    const [formData, setFormData] = React.useState({ username: '', email: '', password: '', confirmPassword: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        onRegister({ username: formData.username, email: formData.email, password: formData.password });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                    Register
                </button>
            </form>
            <p className="mt-4 text-center text-gray-600">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="text-red-500 hover:text-red-600">
                    Login here
                </button>
            </p>
        </div>
    );
};

// Request Password Reset Form
const RequestResetView = ({ onBackToLogin, onResetSent }) => {
    const [email, setEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage(data.message);
                setTimeout(() => onResetSent(email), 2000);
            } else {
                setMessage(data.error || 'Failed to send reset email');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Reset Password</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter your email address"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
            
            {message && (
                <div className={`mt-4 p-3 rounded-md text-sm ${
                    message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                    {message}
                </div>
            )}
            
            <div className="mt-4 text-center">
                <button onClick={onBackToLogin} className="text-red-500 hover:text-red-600">
                    Back to Login
                </button>
            </div>
        </div>
    );
};

// Set New Password Form
const SetNewPasswordView = ({ email, onPasswordReset, onBackToLogin }) => {
    const [formData, setFormData] = React.useState({ new_password: '', confirm_password: '' });
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.new_password !== formData.confirm_password) {
            setMessage('Passwords do not match');
            return;
        }

        if (formData.new_password.length < 6) {
            setMessage('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            // Extract token from URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token') || window.location.pathname.split('/').pop();
            
            const response = await fetch(`/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: formData.new_password })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('Password reset successfully!');
                setTimeout(() => onPasswordReset(), 2000);
            } else {
                setMessage(data.error || 'Failed to reset password');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Set New Password</h2>
            <p className="text-center text-gray-600 mb-4">Reset password for: {email}</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                        type="password"
                        value={formData.new_password}
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter new password"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Confirm new password"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
            
            {message && (
                <div className={`mt-4 p-3 rounded-md text-sm ${
                    message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                    {message}
                </div>
            )}
            
            <div className="mt-4 text-center">
                <button onClick={onBackToLogin} className="text-red-500 hover:text-red-600">
                    Back to Login
                </button>
            </div>
        </div>
    );
};

// Mobile Login Form
const MobileLoginView = ({ onBackToLogin, onLoginSuccess }) => {
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [otpSent, setOtpSent] = React.useState(false);

    const handleSendOTP = async () => {
        if (!phoneNumber) {
            setMessage('Please enter a phone number');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('OTP sent successfully! Check your phone.');
                setOtpSent(true);
            } else {
                setMessage(data.error || 'Invalid OTP');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        
        if (!otp) {
            setMessage('Please enter the OTP');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber, otp })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('Login successful!');
                setTimeout(() => onLoginSuccess(data.user), 1000);
            } else {
                setMessage(data.error || 'Invalid OTP');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Mobile Login</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., +1234567890"
                    />
                </div>

                {otpSent && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Enter the 6-digit code"
                        />
                    </div>
                )}

                {!otpSent ? (
                    <button
                        onClick={handleSendOTP}
                        disabled={isLoading}
                        className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                ) : (
                    <button
                        onClick={handleVerifyOTP}
                        disabled={isLoading}
                        className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                )}

                {message && (
                    <div className={`p-3 rounded-md text-sm ${message.toLowerCase().includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}

                <div className="text-center">
                    <button onClick={onBackToLogin} className="text-red-500 hover:text-red-600">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

// Existing Components
const ToolCard = ({ toolId, onSelect }) => {
    const tool = ALL_TOOLS.find(t => t.id === toolId);
    const [isImageLoaded, setIsImageLoaded] = React.useState(false);

    // Lazy load image when component is visible
    React.useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsImageLoaded(true);
                    observer.disconnect();
                }
            });
        }, { rootMargin: '200px' });
        
        const currentRef = document.getElementById(`tool-card-${toolId}`);
        if (currentRef) {
            observer.observe(currentRef);
        }
        
        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [toolId]);
    
    return (
        <div 
            id={`tool-card-${toolId}`}
            onClick={() => onSelect(toolId)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(toolId);
                }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Open ${tool.name}`}
            className="bg-white rounded-lg shadow-md p-5 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-red-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-300"
        >
            <div className="flex items-center mb-3">
                <div className="bg-red-50 text-red-500 p-3 rounded-lg mr-3 flex-shrink-0">
                    {isImageLoaded && renderIcon(tool.icon, 24)}
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{tool.name}</h3>
            </div>
            <p className="text-gray-600 text-sm">{tool.description}</p>
            {tool.allowMultiple && (
                <span className="inline-block mt-2 text-xs font-medium bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                    Supports multiple files
                </span>
            )}
            <div className="mt-3 text-right">
                <span className="inline-flex items-center text-sm font-medium text-red-500 hover:text-red-600">
                    Use tool
                    <svg className="ml-1 w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </span>
            </div>
        </div>
    );
};

// Landing navigation data (provided structure)
const MENU_TOOLS = {
    organize: [
        { id: 'merge', name: 'Merge PDF' },
        { id: 'split', name: 'Split PDF' },
        { id: 'organize', name: 'Organize PDF' },
        { id: 'rotate', name: 'Rotate PDF' },
    ],
    optimize: [
        { id: 'compress', name: 'Compress PDF' },
        { id: 'repair', name: 'Repair PDF' },
    ],
    convert: [
        { id: 'pdf_to_word', name: 'PDF to Word' },
        { id: 'pdf_to_powerpoint', name: 'PDF to PowerPoint' },
        { id: 'pdf_to_excel', name: 'PDF to Excel' },
        { id: 'pdf_to_jpg', name: 'PDF to JPG' },
        { id: 'word_to_pdf', name: 'Word to PDF' },
        { id: 'powerpoint_to_pdf', name: 'PowerPoint to PDF' },
        { id: 'excel_to_pdf', name: 'Excel to PDF' },
        { id: 'jpg_to_pdf', name: 'JPG to PDF' },
    ],
    edit: [
        { id: 'add_page_numbers', name: 'Add Page Numbers' },
        { id: 'watermark', name: 'Add Watermark' },
        { id: 'edit_pdf', name: 'Edit PDF' },
    ],
    security: [
        { id: 'unlock', name: 'Unlock PDF' },
        { id: 'protect', name: 'Protect PDF' },
        { id: 'sign', name: 'Sign PDF' },
    ],
};

const NavDropdown = ({ title, items, onItemClick }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div className="relative" onMouseLeave={() => setIsOpen(false)}>
            <button
                onMouseEnter={() => setIsOpen(true)}
                className="text-sm font-medium text-gray-700 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
                <span>{title}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border rounded-md shadow-lg p-2 z-50">
                    {items.map((item) => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => { e.preventDefault(); onItemClick(item.id); }}
                            className="block px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-red-50 hover:text-red-600"
                        >
                            {item.name}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

const FileItem = ({ file, onRemove }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md mb-2">
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mr-3">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span className="text-gray-700 font-medium">{file.name}</span>
                <span className="text-gray-500 text-sm ml-2">({formatBytes(file.size)})</span>
            </div>
            <button 
                onClick={onRemove}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
};

const ToolOptions = ({ tool, options, setOptions }) => {
    if (!tool.options || tool.options.length === 0) return null;

    return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Options</h3>
            {tool.options.map((option) => (
                <div key={option.name} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {option.label}
                    </label>
                    {option.type === 'select' ? (
                        <select
                            value={options[option.name] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.name]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                            {(option.options || []).map((choice) => (
                                <option key={choice.value} value={choice.value}>
                                    {choice.label}
                                </option>
                            ))}
                        </select>
                    ) : option.type === 'multiselect' ? (
                        <div className="space-y-2">
                            {(option.options || []).map((choice) => {
                                const selected = Array.isArray(options[option.name]) && options[option.name].includes(choice.value);
                                return (
                                    <label key={choice.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={!!selected}
                                            onChange={(e) => {
                                                setOptions(prev => {
                                                    const prevArr = Array.isArray(prev[option.name]) ? prev[option.name] : [];
                                                    const nextArr = e.target.checked
                                                        ? [...prevArr, choice.value]
                                                        : prevArr.filter(v => v !== choice.value);
                                                    return { ...prev, [option.name]: nextArr };
                                                });
                                            }}
                                        />
                                        <span>{choice.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : option.type === 'password' ? (
                        <input
                            type="password"
                            value={options[option.name] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.name]: e.target.value }))}
                            placeholder={option.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    ) : option.type === 'text' ? (
                        <input
                            type="text"
                            value={options[option.name] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.name]: e.target.value }))}
                            placeholder={option.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    ) : option.type === 'number' ? (
                        <input
                            type="number"
                            value={options[option.name] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.name]: parseFloat(e.target.value) }))}
                            placeholder={option.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    ) : option.type === 'json' ? (
                        <textarea
                            value={options[option.name] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.name]: e.target.value }))}
                            placeholder={option.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    ) : option.type === 'file' ? (
                        <input
                            type="file"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                setOptions(prev => ({ ...prev, [option.name]: file }));
                            }}
                            accept={option.accept || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    ) : null}
                </div>
            ))}
        </div>
    );
};

const Dropzone = ({ onFilesAdded, tool, onSelectClick }) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDrag = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesAdded(Array.from(e.dataTransfer.files));
            e.dataTransfer.clearData();
        }
    }, [onFilesAdded]);

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors duration-200 ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}
        >
            <div className="text-red-500 mb-4">{renderIcon(tool.icon, 48)}</div>
            <p className="text-xl font-semibold text-gray-700">Drop files here</p>
            <p className="text-gray-500 mt-1">PDF, Jupyter notebooks, Python, Office documents, images, etc.</p>
            <p className="text-gray-500 mt-1">or</p>
            <button onClick={onSelectClick} className="mt-4 px-6 py-2 bg-red-500 text-white font-semibold rounded-md cursor-pointer hover:bg-red-600 transition-colors">
                Select Files
            </button>
        </div>
    );
};

// Mount the React application
// Create a root using the new React 18 API
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

// Optional PropTypes (only define if available globally)
if (window && window.PropTypes) {
    const { PropTypes } = window;
    ToolCard.propTypes = {
        toolId: PropTypes.string.isRequired,
        onSelect: PropTypes.func.isRequired,
    };
    FileItem.propTypes = {
        file: PropTypes.object.isRequired,
        onRemove: PropTypes.func.isRequired,
    };
    ToolOptions.propTypes = {
        tool: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,
        setOptions: PropTypes.func.isRequired,
    };
    Dropzone.propTypes = {
        onFilesAdded: PropTypes.func.isRequired,
        tool: PropTypes.object.isRequired,
        onSelectClick: PropTypes.func.isRequired,
    };
}

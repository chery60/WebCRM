import { NextRequest, NextResponse } from 'next/server';

// Well-known component libraries with pre-mapped component lists
const KNOWN_LIBRARIES: Record<string, Array<{ components: string[]; category: string }>> = {
  '@shadcn/ui': [
    {
      category: 'UI Components',
      components: [
        'Accordion', 'Alert', 'AlertDialog', 'AspectRatio', 'Avatar', 'Badge', 'Button',
        'Calendar', 'Card', 'Carousel', 'Checkbox', 'Collapsible', 'Command', 'ContextMenu',
        'DataTable', 'DatePicker', 'Dialog', 'Drawer', 'DropdownMenu', 'Form', 'HoverCard',
        'Input', 'Label', 'Menubar', 'NavigationMenu', 'Pagination', 'Popover', 'Progress',
        'RadioGroup', 'ResizablePanels', 'ScrollArea', 'Select', 'Separator', 'Sheet',
        'Skeleton', 'Slider', 'Switch', 'Table', 'Tabs', 'Textarea', 'Toast', 'Toggle', 'Tooltip',
      ],
    },
  ],
  'shadcn-ui': [
    {
      category: 'UI Components',
      components: [
        'Accordion', 'Alert', 'AlertDialog', 'Avatar', 'Badge', 'Button', 'Card', 'Checkbox',
        'Dialog', 'DropdownMenu', 'Form', 'Input', 'Label', 'Popover', 'Select', 'Separator',
        'Sheet', 'Skeleton', 'Switch', 'Table', 'Tabs', 'Textarea', 'Toast', 'Toggle', 'Tooltip',
      ],
    },
  ],
  '@mui/material': [
    {
      category: 'Inputs',
      components: [
        'Autocomplete', 'Button', 'ButtonGroup', 'Checkbox', 'Fab', 'FormControl', 'IconButton',
        'RadioGroup', 'Rating', 'Select', 'Slider', 'Switch', 'TextField', 'ToggleButton',
      ],
    },
    {
      category: 'Data Display',
      components: [
        'Avatar', 'Badge', 'Chip', 'Divider', 'Icon', 'List', 'Table', 'Tooltip', 'Typography',
      ],
    },
    {
      category: 'Feedback',
      components: [
        'Alert', 'Backdrop', 'CircularProgress', 'Dialog', 'LinearProgress', 'Skeleton', 'Snackbar',
      ],
    },
    {
      category: 'Surfaces',
      components: ['Accordion', 'AppBar', 'Card', 'Paper'],
    },
    {
      category: 'Navigation',
      components: [
        'BottomNavigation', 'Breadcrumbs', 'Drawer', 'Link', 'Menu', 'Pagination', 'SpeedDial',
        'Stepper', 'Tabs',
      ],
    },
    {
      category: 'Layout',
      components: ['Box', 'Container', 'Grid', 'ImageList', 'Stack'],
    },
  ],
  'antd': [
    {
      category: 'General',
      components: ['Button', 'FloatButton', 'Icon', 'Typography'],
    },
    {
      category: 'Layout',
      components: ['Divider', 'Flex', 'Grid', 'Layout', 'Space'],
    },
    {
      category: 'Navigation',
      components: [
        'Affix', 'Anchor', 'Breadcrumb', 'Dropdown', 'Menu', 'Pagination', 'Steps',
      ],
    },
    {
      category: 'Data Entry',
      components: [
        'AutoComplete', 'Cascader', 'Checkbox', 'ColorPicker', 'DatePicker', 'Form', 'Input',
        'InputNumber', 'Mentions', 'Radio', 'Rate', 'Select', 'Slider', 'Switch', 'TimePicker',
        'Transfer', 'TreeSelect', 'Upload',
      ],
    },
    {
      category: 'Data Display',
      components: [
        'Avatar', 'Badge', 'Calendar', 'Card', 'Carousel', 'Collapse', 'Descriptions', 'Empty',
        'Image', 'List', 'Popover', 'QRCode', 'Segmented', 'Statistic', 'Table', 'Tabs',
        'Tag', 'Timeline', 'Tooltip', 'Tour', 'Tree',
      ],
    },
    {
      category: 'Feedback',
      components: [
        'Alert', 'Drawer', 'Message', 'Modal', 'Notification', 'Popconfirm', 'Progress',
        'Result', 'Skeleton', 'Spin', 'Watermark',
      ],
    },
  ],
  '@chakra-ui/react': [
    {
      category: 'Layout',
      components: [
        'Box', 'Center', 'Container', 'Flex', 'Grid', 'SimpleGrid', 'Stack', 'Wrap',
      ],
    },
    {
      category: 'Typography',
      components: ['Code', 'Heading', 'Highlight', 'Kbd', 'Mark', 'Text'],
    },
    {
      category: 'Forms',
      components: [
        'Checkbox', 'Editable', 'FormControl', 'Input', 'NumberInput', 'PinInput',
        'Radio', 'RangeSlider', 'Select', 'Slider', 'Switch', 'Textarea',
      ],
    },
    {
      category: 'Data Display',
      components: [
        'Avatar', 'Badge', 'Card', 'Code', 'Divider', 'Image', 'Indicator', 'Kbd',
        'List', 'Stat', 'Table', 'Tag',
      ],
    },
    {
      category: 'Feedback',
      components: [
        'Alert', 'CircularProgress', 'Progress', 'Skeleton', 'Spinner', 'Toast',
      ],
    },
    {
      category: 'Overlay',
      components: [
        'AlertDialog', 'Drawer', 'Menu', 'Modal', 'Popover', 'Tooltip',
      ],
    },
    {
      category: 'Navigation',
      components: ['Breadcrumb', 'Link', 'LinkBox', 'Tabs'],
    },
  ],
  'mantine': [
    {
      category: 'Inputs',
      components: [
        'Autocomplete', 'Checkbox', 'Chip', 'ColorInput', 'ColorPicker', 'FileInput',
        'JsonInput', 'MultiSelect', 'NativeSelect', 'NumberInput', 'PasswordInput',
        'PinInput', 'Radio', 'Rating', 'SegmentedControl', 'Select', 'Slider', 'Switch',
        'TagsInput', 'Textarea', 'TextInput', 'YearPickerInput',
      ],
    },
    {
      category: 'Layout',
      components: [
        'AppShell', 'AspectRatio', 'Center', 'Container', 'Flex', 'Grid', 'Group',
        'SimpleGrid', 'Space', 'Stack',
      ],
    },
    {
      category: 'Navigation',
      components: ['Anchor', 'Breadcrumbs', 'Burger', 'NavLink', 'Pagination', 'Stepper', 'Tabs'],
    },
    {
      category: 'Data Display',
      components: [
        'Accordion', 'Avatar', 'Badge', 'Card', 'Code', 'ColorSwatch', 'Divider',
        'HoverCard', 'Image', 'Indicator', 'Kbd', 'List', 'Mark', 'Popover',
        'Progress', 'RingProgress', 'Table', 'ThemeIcon', 'Timeline', 'Tooltip',
      ],
    },
    {
      category: 'Feedback',
      components: ['Alert', 'Loader', 'Notification', 'Overlay', 'Skeleton'],
    },
    {
      category: 'Overlay',
      components: ['Drawer', 'Menu', 'Modal'],
    },
  ],
  '@radix-ui/react-primitives': [
    {
      category: 'Primitives',
      components: [
        'Accordion', 'AlertDialog', 'AspectRatio', 'Avatar', 'Checkbox', 'Collapsible',
        'ContextMenu', 'Dialog', 'DropdownMenu', 'Form', 'HoverCard', 'Label', 'Menubar',
        'NavigationMenu', 'Popover', 'Progress', 'RadioGroup', 'ScrollArea', 'Select',
        'Separator', 'Slider', 'Switch', 'Tabs', 'Toast', 'Toggle', 'ToggleGroup',
        'Toolbar', 'Tooltip',
      ],
    },
  ],
  'react-bootstrap': [
    {
      category: 'UI Components',
      components: [
        'Accordion', 'Alert', 'Badge', 'Breadcrumb', 'Button', 'ButtonGroup', 'Card',
        'Carousel', 'CloseButton', 'Col', 'Collapse', 'Container', 'Dropdown', 'Figure',
        'Form', 'Image', 'InputGroup', 'ListGroup', 'Modal', 'Nav', 'Navbar', 'Offcanvas',
        'Overlay', 'Pagination', 'Placeholder', 'Popover', 'ProgressBar', 'Row',
        'Spinner', 'Stack', 'Tab', 'Table', 'Toast', 'Tooltip',
      ],
    },
  ],
  'flowbite-react': [
    {
      category: 'UI Components',
      components: [
        'Accordion', 'Alert', 'Avatar', 'Badge', 'Banner', 'Blockquote', 'Breadcrumb',
        'Button', 'Card', 'Carousel', 'Checkbox', 'DarkThemeToggle', 'Datepicker',
        'Dropdown', 'FileInput', 'FloatingLabel', 'Footer', 'HelperText', 'HR', 'Label',
        'List', 'ListGroup', 'MegaMenu', 'Modal', 'Navbar', 'Pagination', 'Progress',
        'Radio', 'RangeSlider', 'Rating', 'Select', 'Sidebar', 'Spinner', 'Table',
        'Tabs', 'TextInput', 'Textarea', 'Timeline', 'Toast', 'Tooltip',
      ],
    },
  ],
  'daisyui': [
    {
      category: 'Actions',
      components: ['Button', 'Dropdown', 'Modal', 'Swap', 'Theme'],
    },
    {
      category: 'Data Display',
      components: [
        'Accordion', 'Avatar', 'Badge', 'Card', 'Carousel', 'Chat', 'Collapse',
        'CountDown', 'Diff', 'Kbd', 'Stat', 'Table', 'Timeline',
      ],
    },
    {
      category: 'Navigation',
      components: ['Breadcrumbs', 'Dock', 'Link', 'Menu', 'Navbar', 'Pagination', 'Steps', 'Tabs'],
    },
    {
      category: 'Feedback',
      components: ['Alert', 'Loading', 'Progress', 'RadialProgress', 'Skeleton', 'Toast', 'Tooltip'],
    },
    {
      category: 'Data Input',
      components: [
        'Checkbox', 'FileInput', 'Input', 'Radio', 'Range', 'Rating', 'Select',
        'Textarea', 'TextInput', 'Toggle',
      ],
    },
    {
      category: 'Layout',
      components: ['Artboard', 'Divider', 'Drawer', 'Footer', 'Hero', 'Indicator', 'Join', 'Mask', 'Stack'],
    },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const packageName = searchParams.get('package');

  if (!packageName) {
    return NextResponse.json({ error: 'Package name is required' }, { status: 400 });
  }

  try {
    // Fetch package metadata from npm registry
    const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

    const response = await fetch(registryUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Package "${packageName}" not found on npm registry` },
        { status: 404 }
      );
    }

    const npmData = await response.json();
    const latestVersion = npmData['dist-tags']?.latest || 'unknown';
    const versionData = npmData.versions?.[latestVersion] || {};

    // Discover components from our known-libraries map
    const knownGroups = KNOWN_LIBRARIES[packageName];
    const discoveredComponents: Array<{ name: string; category: string; filePath: string }> = [];

    if (knownGroups) {
      knownGroups.forEach((group) => {
        group.components.forEach((compName) => {
          discoveredComponents.push({
            name: compName,
            category: group.category,
            filePath: `${packageName}/${compName}`,
          });
        });
      });
    }

    // Extract repository URL
    let repoUrl: string | undefined;
    const repo = versionData.repository || npmData.repository;
    if (repo) {
      if (typeof repo === 'string') {
        repoUrl = repo;
      } else if (repo.url) {
        repoUrl = repo.url
          .replace(/^git\+/, '')
          .replace(/^git:\/\//, 'https://')
          .replace(/\.git$/, '');
      }
    }

    return NextResponse.json({
      name: npmData.name,
      version: latestVersion,
      description: npmData.description || versionData.description || '',
      homepage: versionData.homepage || npmData.homepage,
      repository: repoUrl,
      keywords: versionData.keywords || npmData.keywords || [],
      components: discoveredComponents,
    });
  } catch (error) {
    console.error('[npm-lookup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package information' },
      { status: 500 }
    );
  }
}

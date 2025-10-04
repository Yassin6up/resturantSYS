import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import MenuPage from '../pages/customer/MenuPage';
import { menuAPI } from '../services/api';

// Mock the API
jest.mock('../services/api', () => ({
  menuAPI: {
    getMenu: jest.fn()
  }
}));

// Mock the cart context
jest.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    addItem: jest.fn()
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MenuPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    menuAPI.getMenu.mockResolvedValue({
      data: { categories: [] }
    });

    renderWithProviders(<MenuPage />);
    
    expect(screen.getByText('Loading menu...')).toBeInTheDocument();
  });

  it('renders menu categories and items', async () => {
    const mockMenuData = {
      data: {
        categories: [
          {
            id: 1,
            name: 'Appetizers',
            items: [
              {
                id: 1,
                name: 'Hummus',
                price: 25.00,
                description: 'Creamy chickpea dip',
                modifiers: []
              }
            ]
          }
        ]
      }
    };

    menuAPI.getMenu.mockResolvedValue(mockMenuData);

    renderWithProviders(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Our Menu')).toBeInTheDocument();
      expect(screen.getByText('Appetizers')).toBeInTheDocument();
      expect(screen.getByText('Hummus')).toBeInTheDocument();
      expect(screen.getByText('25.00 MAD')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    menuAPI.getMenu.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Our Menu')).toBeInTheDocument();
    });
  });

  it('opens item modal when item is clicked', async () => {
    const mockMenuData = {
      data: {
        categories: [
          {
            id: 1,
            name: 'Appetizers',
            items: [
              {
                id: 1,
                name: 'Hummus',
                price: 25.00,
                description: 'Creamy chickpea dip',
                modifiers: []
              }
            ]
          }
        ]
      }
    };

    menuAPI.getMenu.mockResolvedValue(mockMenuData);

    renderWithProviders(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Hummus')).toBeInTheDocument();
    });

    // Click on the item
    const hummusItem = screen.getByText('Hummus').closest('div');
    hummusItem.click();

    await waitFor(() => {
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });
  });
});
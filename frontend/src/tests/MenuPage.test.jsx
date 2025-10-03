import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import MenuPage from '../pages/MenuPage'
import api from '../services/api'

// Mock the API
jest.mock('../services/api')

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (ui) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('MenuPage', () => {
  const mockMenuData = {
    branch: {
      id: 1,
      name: 'Casablanca Branch',
      code: 'CAS'
    },
    table: {
      id: 1,
      table_number: 'T1',
      description: 'Table 1'
    },
    menu: [
      {
        id: 1,
        name: 'Appetizers',
        position: 1,
        items: [
          {
            id: 1,
            name: 'Harira Soup',
            description: 'Traditional Moroccan tomato and lentil soup',
            price: 25.00,
            sku: 'APP001',
            modifiers: []
          }
        ]
      }
    ]
  }

  beforeEach(() => {
    api.get.mockResolvedValue({ data: mockMenuData })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders menu page with table and branch info', async () => {
    // Mock URL search params
    const mockSearchParams = new URLSearchParams('table=T1&branch=CAS')
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      return mockSearchParams.get(key)
    })

    renderWithProviders(<MenuPage />)

    await waitFor(() => {
      expect(screen.getByText('Casablanca Branch')).toBeInTheDocument()
      expect(screen.getByText('Table T1')).toBeInTheDocument()
    })
  })

  it('displays categories and menu items', async () => {
    const mockSearchParams = new URLSearchParams('table=T1&branch=CAS')
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      return mockSearchParams.get(key)
    })

    renderWithProviders(<MenuPage />)

    await waitFor(() => {
      expect(screen.getByText('Appetizers')).toBeInTheDocument()
      expect(screen.getByText('Harira Soup')).toBeInTheDocument()
      expect(screen.getByText('25.00 MAD')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    const mockSearchParams = new URLSearchParams('table=T1&branch=CAS')
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      return mockSearchParams.get(key)
    })

    renderWithProviders(<MenuPage />)

    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    api.get.mockRejectedValue(new Error('API Error'))
    
    const mockSearchParams = new URLSearchParams('table=T1&branch=CAS')
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      return mockSearchParams.get(key)
    })

    renderWithProviders(<MenuPage />)

    await waitFor(() => {
      // Should show error state or handle gracefully
      expect(screen.queryByText('Casablanca Branch')).not.toBeInTheDocument()
    })
  })

  it('redirects when table or branch is missing', async () => {
    const mockSearchParams = new URLSearchParams('table=&branch=')
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      return mockSearchParams.get(key)
    })

    const mockNavigate = jest.fn()
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }))

    renderWithProviders(<MenuPage />)

    // Should redirect to home
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
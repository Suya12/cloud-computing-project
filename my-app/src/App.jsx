import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Store_select from './page/store_select/index.jsx'
import Co_order_create from './page/co_order_create/index.jsx'
import Pay from './page/pay/index.jsx'
import Co_deliver_list from './page/co_deliver_list/index.jsx'
import Category from './page/category/index.jsx'
import Deliver_process from './page/deliver_process/index.jsx'
import Login from './page/login/index.jsx'
import MyOrders from './page/my_orders/index.jsx'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/category" element={<Category />} />
          <Route path="/co_deliver_list" element={<Co_deliver_list />} />
          <Route path="/store_select" element={<Store_select />} />
          <Route path="/co_order_create" element={<Co_order_create />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/deliver_process" element={<Deliver_process />} />
          <Route path="/my_orders" element={<MyOrders />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

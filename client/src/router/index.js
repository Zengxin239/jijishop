import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/Home.vue') },
  { path: '/product/:id', name: 'detail', component: () => import('../views/ProductDetail.vue') },
  { path: '/cart', name: 'cart', component: () => import('../views/Cart.vue') },
  { path: '/auth', name: 'auth', component: () => import('../views/Auth.vue') },
  { path: '/checkout', name: 'checkout', component: () => import('../views/Checkout.vue') },
  { path: '/orders', name: 'orders', component: () => import('../views/Orders.vue') },
  { path: '/favorites', name: 'favorites', component: () => import('../views/Favorites.vue') },
  { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue') },
  { path: '/seller', name: 'seller', component: () => import('../views/Seller.vue') },
  { path: '/seller/product-form', name: 'seller-product-form', component: () => import('../views/SellerProductForm.vue') },
  { path: '/seller/product-form/:id', name: 'seller-product-edit', component: () => import('../views/SellerProductForm.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes
})

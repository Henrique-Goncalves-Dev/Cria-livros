import { Routes } from '@angular/router';
import { ReaderFlowPage } from './reader/reader-flow-page';

export const routes: Routes = [
  { path: '', component: ReaderFlowPage },
  { path: 'admin', loadComponent: () => import('./admin/admin-page').then((page) => page.AdminPage) },
  { path: '**', redirectTo: '' },
];

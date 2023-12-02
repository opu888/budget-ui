import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PagingCriteria,
  Page,
  Expense,
  ExpenseCriteria,
  ExpenseUpsertDto,
  SortOption,
  CategoryCriteria, Category
} from "../shared/domain";

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly apiUrl = `${environment.backendUrl}/expenses`;
  private readonly apiV2Url = `${environment.backendUrl}/v2/expenses`;

  constructor(private readonly httpClient: HttpClient) {}

  // Search

  getExpenses = (pagingCriteria: ExpenseCriteria): Observable<Page<Expense>> =>
    this.httpClient.get<Page<Expense>>(this.apiUrl, { params: new HttpParams({ fromObject: { ...pagingCriteria } }) });


  // Create & Update

  upsertExpense = (expense: Expense): Observable<void> => this.httpClient.put<void>(this.apiUrl, expense);

  // Delete

  deleteExpense = (id: string): Observable<void> => this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
}


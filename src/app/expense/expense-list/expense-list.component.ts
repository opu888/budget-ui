import { Component } from '@angular/core';
import { addMonths, set } from 'date-fns';
import {InfiniteScrollCustomEvent, ModalController, RefresherCustomEvent} from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import {Category, Expense, ExpenseCriteria} from '../../shared/domain';
import {DatePipe} from "@angular/common";
import {CategoryService} from "../../category/category.service";
import {ExpenseService} from "../expense.service";
import {ToastService} from "../../shared/service/toast.service";
import {FormBuilder, FormGroup} from "@angular/forms";
import {debounce, finalize, from, groupBy, interval, mergeMap, Subscription, toArray} from "rxjs";
import {formatPeriod} from "../../shared/period";



@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  date = set(new Date(), { date: 1 });
  currentMonth: Date = new Date();
  datePipe: DatePipe = new DatePipe('en-US');


  categories: Category[] = [];
  expenses: Expense[] = [];
  readonly  initialSort = 'date,desc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = { page: 0, size: 25, yearMonth: +(this.datePipe.transform(this.currentMonth, 'yyyyMM'))!, sort: this.initialSort};
  readonly searchForm: FormGroup;
  private readonly searchFormSubscription: Subscription;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly expenseService: ExpenseService,
    private readonly toastService: ToastService,
    private readonly formBuilder: FormBuilder
) {
    this.searchForm = this.formBuilder.group({ name: [], categoryIds: [''], sort: [this.initialSort] });
    this.searchFormSubscription = this.searchForm.valueChanges
        .pipe(debounce((value) => interval(value.name?.length ? 400 : 0)))
        .subscribe((value) => {
          this.searchCriteria = { ...this.searchCriteria, ...value, page: 0 };
          this.loadExpenses();
        });
  }

  async loadCategories() {
    console.log("load");
    this.categoryService.getCategories(this.searchCriteria).subscribe({
      next: (categories) => {
        this.categories.push(...categories.content);
      },
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }

  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
    this.loadExpenses();
  };

  changeMonth(months: number): void {
    this.currentMonth = addMonths(this.currentMonth, months);
    const yearMonth = this.datePipe.transform(this.currentMonth, 'yyyyMM');
    this.searchCriteria = { ...this.searchCriteria, yearMonth: +yearMonth!, page: 0 , sort: 'date,desc'};
    this.loadExpenses();
  }

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ? { ...expense } : {} },
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    this.reloadExpenses();
    console.log('role', role);
  }

  private loadExpenses(next: () => void = () => {}): void {
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    this.expenseService
        .getExpenses(this.searchCriteria)
        .pipe(
            finalize(() => {
              this.loading = false;
              next();
            }),
        )
        .subscribe({
          next: (expenses) => {
            if (this.searchCriteria.page === 0 || !this.expenses) {
              this.expenses = [];
            }
            this.expenses.push(...expenses.content);
            this.lastPageReached = expenses.last;
          },
          error: (error) => this.toastService.displayErrorToast('Could not load expenses', error),
        });
  }

  ionViewDidEnter(): void {
    this.loadExpenses();
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription.unsubscribe();
  }

  loadNextExpensePage($event: any) {
    this.searchCriteria.page++;
    this.loadExpenses(() => ($event as InfiniteScrollCustomEvent).target.complete());
  }

  reloadExpenses($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

}

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


interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}
@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  date = set(new Date(), { date: 1 });
  currentMonth: Date = new Date();
  datePipe: DatePipe = new DatePipe('en-US');

  expenses: Expense[] = [];
  lastPageReached = false;
  loading = false;
  readonly  initialSort = 'date,desc';
  readonly searchForm: FormGroup;
  expenseGroups: ExpenseGroup[] | null = null;
  categories: Category[] = [];
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

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    this.loadExpenses();
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

  changeMonth(monthDelta: number): void {
    this.date = addMonths(this.date, monthDelta);
    this.loadExpenses();
  }

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ? { ...expense } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role);
  }

  private loadExpenses(next: () => void = () => {}): void {
    this.searchCriteria.yearMonth = formatPeriod(this.date);
    if (!this.searchCriteria.categoryIds?.length) delete this.searchCriteria.categoryIds;
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    const groupByDate = this.searchCriteria.sort.startsWith('date');
    this.expenseService
        .getExpenses(this.searchCriteria)
        .pipe(
            finalize(() => (this.loading = false)),
            mergeMap((expensePage) => {
              this.lastPageReached = expensePage.last;
              next();
              if (this.searchCriteria.page === 0 || !this.expenseGroups) this.expenseGroups = [];
              return from(expensePage.content).pipe(
                  groupBy((expense) => (groupByDate ? expense.date : expense.id)),
                  mergeMap((group) => group.pipe(toArray())),
              );
            }),
        )
        .subscribe({
          next: (expenses: Expense[]) => {
            const expenseGroup: ExpenseGroup = {
              date: expenses[0].date,
              expenses: this.sortExpenses(expenses),
            };
            const expenseGroupWithSameDate = this.expenseGroups!.find((other) => other.date === expenseGroup.date);
            if (!expenseGroupWithSameDate || !groupByDate) this.expenseGroups!.push(expenseGroup);
            else
              expenseGroupWithSameDate.expenses = this.sortExpenses([
                ...expenseGroupWithSameDate.expenses,
                ...expenseGroup.expenses,
              ]);
          },
          error: (error) => this.toastService.displayErrorToast('Could not load expenses', error),
        });
  }

  ionViewDidEnter(): void {
    this.loadExpenses();
  }


  loadNextExpensePage($event: any) {
    this.searchCriteria.page++;
    this.loadExpenses(() => ($event as InfiniteScrollCustomEvent).target.complete());
  }

  reloadExpenses($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

  private sortExpenses = (expenses: Expense[]): Expense[] => expenses.sort((a, b) => a.name.localeCompare(b.name));

}

import { Component } from '@angular/core';
import { addMonths, set } from 'date-fns';
import { ModalController } from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { Expense } from '../../shared/domain';
import {DatePipe} from "@angular/common";
import {CategoryService} from "../../category/category.service";
import {ExpenseService} from "../expense.service";
import {ToastService} from "../../shared/service/toast.service";
import {FormBuilder} from "@angular/forms";

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

  changeMonth(monthDelta: number): void {
    this.date = addMonths(this.date, monthDelta);
  }

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly expenseService: ExpenseService,
    private readonly toastService: ToastService,
    private readonly formBuilder: FormBuilder
) {}

  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
  };
  loading: any;

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ? { ...expense } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role);
  }
}

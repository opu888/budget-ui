import { Component } from '@angular/core';
import { addMonths, set } from 'date-fns';
import { ModalController } from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { Expense } from '../../shared/domain';

@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  date = set(new Date(), { date: 1 });

  changeMonth(monthDelta: number): void {
    this.date = addMonths(this.date, monthDelta);
  }

  constructor(private readonly modalCtrl: ModalController) {}

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

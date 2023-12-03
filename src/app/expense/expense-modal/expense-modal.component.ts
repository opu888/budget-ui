import {Component, OnInit, Output} from '@angular/core';
import {ModalController, RefresherCustomEvent} from '@ionic/angular';
import {filter, finalize, from, mergeMap, pipe, tap} from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Category, CategoryCriteria, Expense} from "../../shared/domain";
import {ExpenseService} from "../expense.service";
import {ToastService} from "../../shared/service/toast.service";
import {CategoryService} from "../../category/category.service";
import {DatePipe} from "@angular/common";
import {IonDatetime} from "@ionic/angular";
import {save} from "ionicons/icons";


@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent {

  readonly expenseForm: FormGroup;
  submitting = false;
  expense: Expense = {} as Expense;
  readonly initialSort = 'name,asc';
  searchCriteria: CategoryCriteria = {page: 0, size: 25, sort: this.initialSort};
  categories: Category[] = [];
  datePipe = new DatePipe('en-US');


  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly modalCtrl: ModalController,
    private readonly formBuilder: FormBuilder,
    private readonly toastService: ToastService,
    private readonly categoryService: CategoryService,
    private readonly expenseService: ExpenseService,
    private modalController: ModalController,
  ) {this.expenseForm = this.formBuilder.group({
      id: [],
      name: ['', [Validators.required, Validators.maxLength(40)]], categoryId: [this.expense.categoryId],
      date: [this.datePipe.transform(Date.now(), 'yyyy-MM-ddThh:mm:ss')],
      amount: [''],
    })

  }



    async ngOnInit(): Promise<void> {
        await this.loadCategories();
        this.expense.categoryId = this.expense.category.id;

    }
    async loadCategories() {
        console.log("load");
        this.categoryService.getAllCategories({name:'', sort: 'name,asc'}).subscribe({
            next: (categories) => {
                this.categories.push(...categories);
            },
            error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
        });
    }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

    save(): void {
        this.submitting = true;
        let exp = this.expenseForm.value as Expense;
        this.expenseService
            .upsertExpense(this.expenseForm.value)
            .pipe(finalize(() => (this.submitting = false)))
            .subscribe({
                next: () => {
                    this.toastService.displaySuccessToast('Expense saved');
                    this.modalCtrl.dismiss(null, 'refresh');
                },
                error: (error) => this.toastService.displayErrorToast('Could not save expense', error),
            });
    }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
        .pipe(
            filter((action) => action === 'delete'),
            tap(() => (this.submitting = true)),
            mergeMap(() => this.expenseService.deleteExpense(this.expense.id!)),
            finalize(() => (this.submitting = false)),
        )
        .subscribe({
            next: () => {
                this.toastService.displaySuccessToast('Expense deleted');
                this.modalCtrl.dismiss(null, 'refresh');
            },
            error: (error) => this.toastService.displayErrorToast('Could not delete expense', error),
        });
  }

    ionViewWillEnter(): void {
        this.expenseForm.patchValue(this.expense);
    }



    async reloadCategories($event?: RefresherCustomEvent): Promise<void> {
        this.searchCriteria.page = 0;
        await this.loadCategories();
        if ($event) {
            await $event.target.complete();
        }
    }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }
}



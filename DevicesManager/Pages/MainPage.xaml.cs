using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Windows.Foundation;
using Windows.Foundation.Collections;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;
/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class MainPage : Page
{

    public MainPage()
    {
        this.InitializeComponent();

        MainPageFrame.Navigate(typeof(DashboardPage));
        NavView.ItemInvoked += NavView_ItemInvoked;
    }

    private async void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        if (args.IsSettingsInvoked)
        {
            return;
        }
        else
        {
            switch (args.InvokedItem)
            {
                case "仪表盘":
                    MainPageFrame.Navigate(typeof(DashboardPage));
                    break;
                case "所有设备":
                    MainPageFrame.Navigate(typeof(DevicesPage));
                    break;
                case "用户列表":
                    MainPageFrame.Navigate(typeof(UsersPage));
                    break;
                case "退出登录":
                    if((Application.Current as App).UDP4TrapBackgroundWorker.IsBusy == true)
                        (Application.Current as App).UDP4TrapBackgroundWorker.CancelAsync();
                    if((Application.Current as App).UDP6TrapBackgroundWorker.IsBusy == true)
                        (Application.Current as App).UDP6TrapBackgroundWorker.CancelAsync();
                    try
                    {
                        await (Application.Current as App).httpClient.GetAsync("admin/logout", new CancellationTokenSource(3000).Token);
                    }
                    catch { }
                    finally
                    {
                        Frame.Navigate(typeof(LoginPage));
                    }
                    break;
            }
        }
    }

    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        if (e.Parameter is string)
        {
            this.NavView.PaneTitle = (string )e.Parameter;
        }
        base.OnNavigatedTo(e);
    }
}

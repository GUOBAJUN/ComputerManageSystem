using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using Newtonsoft.Json.Linq;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Collections.ObjectModel;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;

/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class DetailPage : Page
{
    public PointCollection CPU = new();
    public PointCollection Memory = new();
    public PointCollection Swap = new();
    public ObservableCollection<DiskListObject> DiskListData = new();
    public PointCollection Network = new();
    public List<float> PackageLoss = new();

    public DetailPage()
    {
        this.InitializeComponent();
        this.BackBtn.Click += BackBtn_Click;
        this.Level_ComboBox.SelectionChanged += Level_ComboBox_SelectionChanged;
    }

    private async void Level_ComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        var combo = (ComboBox)sender;
        var level = int.Parse(combo.SelectedValue.ToString());
        using StringContent jsonContent = new(
                JsonSerializer.Serialize(new
                {
                    Type = "Device",
                    Target = this.Hostname_TextBlock.Text,
                    level = level
                }), Encoding.UTF8, "application/json");
        try
        {
            using HttpResponseMessage response = await(Application.Current as App).httpClient.PostAsync("admin/config", jsonContent);
            response.EnsureSuccessStatusCode();
            var jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());
            Debug.WriteLine(jsonResponse.ToString());
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
    }

    private void BackBtn_Click(object sender, RoutedEventArgs e)
    {
        Frame.GoBack();
    }

    protected async override void OnNavigatedTo(NavigationEventArgs e)
    {
        if (e.Parameter is string)
        {
            this.Hostname_TextBlock.Text = (string)e.Parameter;
            using StringContent jsonContent = new(
                JsonSerializer.Serialize(new
                {
                    Hostname = (string)e.Parameter,
                }), Encoding.UTF8, "application/json");
            try
            {
                using HttpResponseMessage response = await (Application.Current as App).httpClient.PostAsync("admin/status_single", jsonContent);
                response.EnsureSuccessStatusCode();
                JObject jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());
                this.DeviceName_TextBlock.Text = jsonResponse["systeminfo"].Value<string>("Hostname");
                this.OSName_TextBlock.Text = jsonResponse["systeminfo"].Value<string>("OS_Name");
                this.OSVer_TextBlock.Text = jsonResponse["systeminfo"].Value<string>("OS_Version");
                this.OSArch_TextBlock.Text = jsonResponse["systeminfo"].Value<string>("OS_Arch");
                this.CPU_TextBlock.Text = jsonResponse["systeminfo"].Value<string>("CPU_Name");
                this.RAM_TextBlock.Text = jsonResponse["systeminfo"].Value<string>("RAM");
                var level = int.Parse(jsonResponse["systeminfo"].Value<string>("LEVEL"));
                if ((Application.Current as App).MyLevel < level)
                {
                    ContentDialog contentDialog = new ContentDialog();
                    contentDialog.XamlRoot = this.XamlRoot;
                    contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
                    contentDialog.Content = "您无权查看该设备";
                    contentDialog.Title = "权限不足";
                    contentDialog.CloseButtonText = "确认";
                    await contentDialog.ShowAsync();
                    Frame.GoBack();
                }
                else
                {
                    for (var i = 0; i < (Application.Current as App).MyLevel; i++)
                    {
                        this.Level_ComboBox.Items.Add(i + 1);
                    }
                    this.Level_ComboBox.SelectedIndex = level - 1;
                }
                var x = 235;
                foreach(var result in jsonResponse["results"])
                {
                    CPU.Add(new Point(x, 200 - 190 * float.Parse(result.Value<string>("CPU_Usage"))/100));
                    Memory.Add(new Point(x, 200 - 190 * float.Parse(result.Value<string>("Memory_Usage")) / 100));
                    Swap.Add(new Point(x, 200 - 190 * float.Parse(result.Value<string>("Swap_Usage")) / 100));
                    Network.Add(new Point(x, 200 - 190 * float.Parse(result.Value<string>("Swap_Usage")) / 100));
                    PackageLoss.Add(float.Parse(result.Value<string>("Package_Loss_Rate")));
                    x -= 25;
                }

                var diskInfo = JObject.Parse(jsonResponse["results"][0].Value<string>("Disk_Usage"));

                foreach (var disk in diskInfo)
                {
                    DiskListData.Add(new DiskListObject(disk.Key, double.Parse(disk.Value["Disk Usage"].ToString()), disk.Value["Total"].ToString(), disk.Value["Used"].ToString()));
                }

                this.CPU_Polyline.Points = CPU;
                this.Memory_Polyline.Points = Memory;
                this.Swap_Polyline.Points = Swap;
                this.Network_Polyline.Points = Network;
                this.PackageLoss_Run.Text = PackageLoss.Sum().ToString() + "%";
            }
            catch (Exception ex)
            {
                ContentDialog contentDialog = new ContentDialog();
                contentDialog.XamlRoot = this.XamlRoot;
                contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
                contentDialog.Content = ex.Message;
                contentDialog.Title = ex.GetType().Name;
                contentDialog.CloseButtonText = "确认";
                try
                {
                    await contentDialog.ShowAsync();
                }
                catch { }
            }
        }
        base.OnNavigatedTo(e);
    }

    private async void Expander_Expanding(Expander sender, ExpanderExpandingEventArgs args)
    {
        try
        {
            var msg = new HttpRequestMessage(HttpMethod.Get, "admin/get_trap");
            msg.Headers.Add("Hostname", this.Hostname_TextBlock.Text);
            using HttpResponseMessage response = await (Application.Current as App).httpClient.SendAsync(msg);
            response.EnsureSuccessStatusCode();
            var jsonResonse = JObject.Parse(await  response.Content.ReadAsStringAsync());
            this.CPU_NumberBox.Value = (double)jsonResonse.Value<int>("CPU");
            this.RAM_NumberBox.Value = (double)jsonResonse.Value<int>("Memory");
            this.Net_NumberBox.Value = (double)jsonResonse.Value<int>("Net");
        }
        catch { }
    }

    private async void CPU_Button_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(this.CPU_NumberBox.Text))
        {
            return;
        }
        using StringContent jsonContent = new(
            JsonSerializer.Serialize(new
            {
                type = "CPU",
                data = this.CPU_NumberBox.Value,
                Hostname = this.Hostname_TextBlock.Text
            }), Encoding.UTF8, "application/json");
        try
        {
            using HttpResponseMessage response = await(Application.Current as App).httpClient.PostAsync("admin/update_trap", jsonContent);
            response.EnsureSuccessStatusCode();
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Title = "修改成功";
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
    }

    private async void RAM_Button_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(this.RAM_NumberBox.Text))
        {
            return;
        }
        using StringContent jsonContent = new(
            JsonSerializer.Serialize(new
            {
                type = "Memory",
                data = this.RAM_NumberBox.Value,
                Hostname = this.Hostname_TextBlock.Text
            }), Encoding.UTF8, "application/json");
        try
        {
            using HttpResponseMessage response = await(Application.Current as App).httpClient.PostAsync("admin/update_trap", jsonContent);
            response.EnsureSuccessStatusCode();
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Title = "修改成功";
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
    }

    private async void Net_Button_Click(object sender, RoutedEventArgs e)
    {
        if(string.IsNullOrEmpty(Net_NumberBox.Text))
        {
            return;
        }
        using StringContent jsonContent = new(
            JsonSerializer.Serialize(new
            {
                type = "Net",
                data = this.Net_NumberBox.Value,
                Hostname = this.Hostname_TextBlock.Text
            }), Encoding.UTF8, "application/json");
        try
        {
            using HttpResponseMessage response = await(Application.Current as App).httpClient.PostAsync("admin/update_trap", jsonContent);
            response.EnsureSuccessStatusCode();
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Title = "修改成功";
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
    }
}

public class DiskListObject
{
    public string MountPoint
    {
        get; set;
    }
    public double DiskUsage
    {
        get; set;
    }
    public string Total
    {
        get; set;
    }
    public string Used
    {
        get; set;
    }

    public DiskListObject(string mountPoint, double diskUsage, string total, string used)
    {
        MountPoint = mountPoint;
        DiskUsage = diskUsage;
        Total = total;
        Used = used;
    }
}